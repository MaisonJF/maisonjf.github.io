import {
  buildSensorPrompt, clampInt, domainOf, isTrue, privacySafeText,
  sha256Hex, territoriesForDate, uniqueCanonicalUrls
} from './core.js';
import { configuredProviders, PROVIDERS } from './providers.js';
import { configuredOsirisSources, fetchOsirisSource, sourceDefinition, osirisSourceDue } from './sources.js';
import { mirrorToOsirisMemory } from './memory.js';
import { configuredPublicSourceTasks, fetchPublicSource, publicSourceDue, publicTaskIdentity } from './public_sources.js';
import { configuredSearchVisibilityTasks, fetchSearchVisibility, searchVisibilityDue, searchVisibilityTaskIdentity } from './search_visibility.js';
import { buildVisibilityProbePrompt, decorateVisibilityResult, probesForDate, providerCanRunProbe } from './visibility_probes.js';
import { handleBrainControlRequest } from './control_api.js';
import { handleBrainProposalRequest } from './proposal_api.js';
import { handleBrainReviewDecisionRequest } from './review_decision_api.js';

function id(prefix) { return `${prefix}${crypto.randomUUID()}`; }
function utcDay(date = new Date()) { return date.toISOString().slice(0, 10); }

async function controlState(env) {
  if (isTrue(env.KILL_SWITCH) || !isTrue(env.WORKER_ENABLED)) return { enabled: false, reason: 'environment_disabled' };
  const row = await env.GROWTH_DB.prepare(
    `SELECT kill_switch, observe_only FROM external_intelligence_control WHERE control_id='global'`
  ).first();
  if (!row || Number(row.kill_switch) === 1) return { enabled: false, reason: 'database_kill_switch' };
  return { enabled: true, observeOnly: Number(row.observe_only) !== 0 };
}

async function underDailyCap(env, providerId, day, requestedCap = null) {
  const cap = clampInt(requestedCap ?? env.MAX_DAILY_CALLS_PER_PROVIDER, 2, 1, 200);
  const row = await env.GROWTH_DB.prepare(
    `SELECT calls FROM external_intelligence_daily_usage WHERE usage_date=? AND provider_id=?`
  ).bind(day, providerId).first();
  return Number(row?.calls ?? 0) < cap;
}

async function markUsage(env, providerId, day, ok, usage) {
  const reportedCost = Number(usage?.cost?.total_cost ?? usage?.total_cost ?? 0) || 0;
  await env.GROWTH_DB.prepare(`
    INSERT INTO external_intelligence_daily_usage
      (usage_date,provider_id,calls,failures,reported_cost_usd,updated_at)
    VALUES (?,?,1,?,?,datetime('now'))
    ON CONFLICT(usage_date,provider_id) DO UPDATE SET
      calls=calls+1,
      failures=failures+excluded.failures,
      reported_cost_usd=reported_cost_usd+excluded.reported_cost_usd,
      updated_at=datetime('now')
  `).bind(day, providerId, ok ? 0 : 1, reportedCost).run();
}

async function alreadyDone(env, taskKey) {
  return !!(await env.GROWTH_DB.prepare(
    `SELECT observation_id FROM external_intelligence_observations WHERE task_key=? LIMIT 1`
  ).bind(taskKey).first());
}

async function persistObservation(env, task, result) {
  const safeText = privacySafeText(result.text);
  if (!safeText) throw new Error('empty_provider_response');
  const citations = uniqueCanonicalUrls(result.citations ?? []);
  const responseHash = await sha256Hex(safeText);
  const payloadHash = await sha256Hex(JSON.stringify({
    provider: result.providerId, model: result.modelId, territory: task.territoryKey,
    responseHash, citations
  }));
  const eventId = id('evt_');
  const observationId = id('obs_');
  const evidenceId = id('evd_');
  const observedAt = new Date().toISOString();
  const source = `a13.${result.providerId}`.slice(0, 80);
  const idempotencyKey = task.taskKey.slice(0, 200);
  const independentEvidenceRoots = Number.isInteger(result.independentEvidenceRoots)
    ? Math.max(0,result.independentEvidenceRoots)
    : citations.length;
  const groundingState = result.groundingState || (citations.length ? 'grounded' : 'ungrounded');
  const strength = Number.isFinite(Number(result.strength))
    ? Math.max(0,Math.min(100,Number(result.strength)))
    : citations.length >= 3 ? 80 : citations.length >= 1 ? 60 : 25;
  const confidenceClass = result.confidenceClass || (citations.length >= 2 ? 'high' : citations.length >= 1 ? 'medium' : 'low');
  const evidenceSource = result.evidenceSource || 'system';
  const evidenceKind = result.evidenceKind || 'demand';
  const sourceKind = result.sourceKind || 'external_intelligence';
  const metadata = JSON.stringify({
    a13: true, territory_key: task.territoryKey, provider_id: result.providerId,
    model_id: result.modelId, grounding_state: groundingState,
    independent_evidence_roots: independentEvidenceRoots,
    source_kind: sourceKind
  });
  const evidenceFacts = JSON.stringify({
    source_kind: sourceKind,
    territory_key: task.territoryKey,
    provider_id: result.providerId,
    model_id: result.modelId,
    grounding_state: groundingState,
    independent_evidence_roots: independentEvidenceRoots,
    normalized_language: safeText,
    citations
  });

  const statements = [
    env.GROWTH_DB.prepare(`
      INSERT INTO events
        (event_id,idempotency_key,event_type,source,schema_version,occurred_at,privacy_class,payload_hash,metadata_json)
      VALUES (?,?,?,?,2,?,'system',?,?)
    `).bind(eventId,idempotencyKey,'external_intelligence.observation',source,observedAt,payloadHash,metadata),
    env.GROWTH_DB.prepare(`
      INSERT INTO external_intelligence_observations
        (observation_id,event_id,task_key,provider_id,model_id,source_class,territory_key,
         prompt_fingerprint,response_hash,grounding_state,response_excerpt,citations_json,usage_json,
         provider_request_id,observed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      observationId,eventId,task.taskKey,result.providerId,result.modelId ?? null,result.sourceClass,
      task.territoryKey,task.promptFingerprint,responseHash,groundingState,safeText,
      JSON.stringify(citations),JSON.stringify(result.usage ?? {}),result.requestId ?? null,observedAt
    ),
    env.GROWTH_DB.prepare(`
      INSERT INTO map_evidence
        (evidence_id,source,source_event_id,journey_id,evidence_kind,observed_at,strength,
         confidence_class,payload_hash,facts_json,created_at)
      VALUES (?,?,?,NULL,?,?,?,?,?,?,?)
    `).bind(
      evidenceId,evidenceSource,eventId,evidenceKind,observedAt,strength,confidenceClass,payloadHash,evidenceFacts,observedAt
    )
  ];

  for (const url of citations) {
    statements.push(env.GROWTH_DB.prepare(`
      INSERT INTO external_intelligence_evidence_roots(root_url,root_domain,first_seen_at,last_seen_at)
      VALUES (?,?,?,?)
      ON CONFLICT(root_url) DO UPDATE SET last_seen_at=excluded.last_seen_at
    `).bind(url,domainOf(url),observedAt,observedAt));
    statements.push(env.GROWTH_DB.prepare(`
      INSERT OR IGNORE INTO external_intelligence_observation_roots(observation_id,root_url)
      VALUES (?,?)
    `).bind(observationId,url));
  }
  await env.GROWTH_DB.batch(statements);

  try {
    await mirrorToOsirisMemory(env, {
      observationId,
      eventId,
      providerId: result.providerId,
      modelId: result.modelId ?? null,
      sourceClass: result.sourceClass,
      territoryKey: task.territoryKey,
      groundingState,
      observedAt,
      confidenceClass,
      citations,
      safeText
    });
  } catch (error) {
    console.error('Osiris Memory mirror failed', observationId, error?.message ?? error);
  }
}

async function processSourceTask(env, task) {
  const control = await controlState(env);
  if (!control.enabled) return { skipped: control.reason };
  if (await alreadyDone(env, task.taskKey)) return { skipped: 'duplicate_task' };
  const day = task.day || utcDay();
  const cap = env.MAX_DAILY_CALLS_PER_OSIRIS_SOURCE || '24';
  if (!(await underDailyCap(env, task.providerId, day, cap))) return { skipped: 'daily_cap' };

  let result;
  try {
    result = await fetchOsirisSource(env, task.sourceKey);
    await markUsage(env, task.providerId, day, true, null);
  } catch (error) {
    await markUsage(env, task.providerId, day, false, null);
    throw error;
  }

  await persistObservation(env, task, result);
  return { stored: true, provider: task.providerId, territory: task.territoryKey };
}

async function processPublicSourceTask(env, task) {
  const control = await controlState(env);
  if (!control.enabled) return { skipped: control.reason };
  if (await alreadyDone(env, task.taskKey)) return { skipped: 'duplicate_task' };
  const day = task.day || utcDay();
  const cap = env.MAX_DAILY_CALLS_PER_PUBLIC_SOURCE || '4';
  if (!(await underDailyCap(env, task.providerId, day, cap))) return { skipped: 'daily_cap' };

  let result;
  try {
    result = await fetchPublicSource(env, task.publicTask);
    await markUsage(env, task.providerId, day, true, result.usage);
  } catch (error) {
    await markUsage(env, task.providerId, day, false, null);
    throw error;
  }
  await persistObservation(env, task, result);
  return { stored: true, provider: task.providerId, territory: task.territoryKey };
}

async function processSearchVisibilityTask(env, task) {
  const control = await controlState(env);
  if (!control.enabled) return { skipped: control.reason };
  if (await alreadyDone(env, task.taskKey)) return { skipped: 'duplicate_task' };
  const day = task.day || utcDay();
  const cap = env.MAX_DAILY_CALLS_PER_SEARCH_SOURCE || '5';
  const usageKey = 'search:' + task.providerId;
  if (!(await underDailyCap(env, usageKey, day, cap))) return { skipped: 'daily_cap' };

  let result;
  try {
    result = await fetchSearchVisibility(env, task.searchTask, new Date(task.scheduledAt));
    await markUsage(env, usageKey, day, true, result.usage);
  } catch (error) {
    await markUsage(env, usageKey, day, false, null);
    throw error;
  }
  await persistObservation(env, task, result);
  return { stored: true, provider: task.providerId, territory: task.territoryKey };
}

async function processVisibilityProbeTask(env, task) {
  const control = await controlState(env);
  if (!control.enabled) return { skipped: control.reason };
  if (await alreadyDone(env, task.taskKey)) return { skipped: 'duplicate_task' };
  const day = task.day || utcDay();
  const cap = env.MAX_DAILY_CALLS_PER_VISIBILITY_PROVIDER || '2';
  const usageKey = 'visibility:' + task.providerId;
  if (!(await underDailyCap(env, usageKey, day, cap))) return { skipped: 'daily_cap' };
  const caller = PROVIDERS[task.providerId];
  if (!caller) return { skipped: 'unknown_provider' };

  let result;
  try {
    result = decorateVisibilityResult(await caller(env, task.prompt), task.probe);
    await markUsage(env, usageKey, day, true, result.usage);
  } catch (error) {
    await markUsage(env, usageKey, day, false, null);
    throw error;
  }
  await persistObservation(env, task, result);
  return { stored: true, provider: task.providerId, territory: task.territoryKey, probe: task.probe.id };
}
async function processTask(env, task) {
  const control = await controlState(env);
  if (!control.enabled) return { skipped: control.reason };
  if (await alreadyDone(env, task.taskKey)) return { skipped: 'duplicate_task' };
  const day = task.day || utcDay();
  if (!(await underDailyCap(env, task.providerId, day))) return { skipped: 'daily_cap' };
  const caller = PROVIDERS[task.providerId];
  if (!caller) return { skipped: 'unknown_provider' };

  let result;
  try {
    result = await caller(env, task.prompt);
    await markUsage(env, task.providerId, day, true, result.usage);
  } catch (error) {
    await markUsage(env, task.providerId, day, false, null);
    throw error;
  }
  await persistObservation(env, task, result);
  return { stored: true, provider: task.providerId, territory: task.territoryKey };
}

async function enqueueOsirisRun(env, scheduledDate) {
  const control = await controlState(env);
  if (!control.enabled) return { queued: 0, reason: control.reason };

  const sourceKeys = configuredOsirisSources(env);
  if (!sourceKeys.length) return { queued: 0, reason: 'osiris_disabled_or_no_sources' };

  const day = utcDay(scheduledDate);
  const hour = scheduledDate.toISOString().slice(0, 13);
  const messages = [];

  for (const sourceKey of sourceKeys) {
    const def = sourceDefinition(sourceKey);
    if (!def || !osirisSourceDue(env, sourceKey, scheduledDate)) continue;
    const providerId = `osiris_${sourceKey}`;
    const cap = env.MAX_DAILY_CALLS_PER_OSIRIS_SOURCE || '24';
    if (!(await underDailyCap(env, providerId, day, cap))) continue;
    const promptFingerprint = await sha256Hex(`${env.OSIRIS_BASE_URL || 'https://osirisai.live'}${def.path}`);
    messages.push({ body: {
      kind: 'source_snapshot',
      day,
      providerId,
      sourceKey,
      territoryKey: def.territoryKey,
      prompt: `Passive OSIRIS source snapshot: ${sourceKey}`,
      promptFingerprint,
      taskKey: `${hour}:osiris:${sourceKey}`
    }});
  }

  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0, 100));
  return { queued: messages.length, sources: sourceKeys.length };
}

async function enqueuePublicSourceRun(env, scheduledDate) {
  const control = await controlState(env);
  if (!control.enabled) return { queued: 0, reason: control.reason };

  const configured = configuredPublicSourceTasks(env);
  if (!configured.length) return { queued: 0, reason: 'public_sources_disabled_or_unconfigured' };

  const day = utcDay(scheduledDate);
  const hour = scheduledDate.toISOString().slice(0, 13);
  const messages = [];
  for (const publicTask of configured) {
    if (!publicSourceDue(publicTask, scheduledDate)) continue;
    const providerId = publicTask.providerId;
    const cap = env.MAX_DAILY_CALLS_PER_PUBLIC_SOURCE || '4';
    if (!(await underDailyCap(env, providerId, day, cap))) continue;
    const promptFingerprint = await sha256Hex(publicTaskIdentity(publicTask));
    messages.push({ body: {
      kind: 'public_source_snapshot',
      day,
      providerId,
      territoryKey: publicTask.territoryKey,
      prompt: `Public source snapshot: ${publicTask.family}/${publicTask.key}`,
      promptFingerprint,
      taskKey: `${hour}:public:${publicTask.family}:${publicTask.key}`,
      publicTask
    }});
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0, 100));
  return { queued: messages.length, configured: configured.length };
}

async function enqueueSearchVisibilityRun(env, scheduledDate) {
  const control = await controlState(env);
  if (!control.enabled) return { queued: 0, reason: control.reason };
  const configured = configuredSearchVisibilityTasks(env);
  if (!configured.length) return { queued: 0, reason: 'search_visibility_disabled_or_unconfigured' };

  const day = utcDay(scheduledDate);
  const hour = scheduledDate.toISOString().slice(0, 13);
  const messages = [];
  for (const searchTask of configured) {
    if (!searchVisibilityDue(searchTask, scheduledDate)) continue;
    const usageKey = 'search:' + searchTask.providerId;
    const cap = env.MAX_DAILY_CALLS_PER_SEARCH_SOURCE || '5';
    if (!(await underDailyCap(env, usageKey, day, cap))) continue;
    const promptFingerprint = await sha256Hex(searchVisibilityTaskIdentity(searchTask));
    messages.push({ body: {
      kind: 'search_visibility_snapshot',
      day,
      providerId: searchTask.providerId,
      territoryKey: searchTask.territoryKey,
      prompt: 'Search visibility snapshot: ' + searchTask.key,
      promptFingerprint,
      taskKey: hour + ':search:' + searchTask.providerId + ':' + searchTask.key,
      scheduledAt: scheduledDate.toISOString(),
      searchTask
    }});
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0, 100));
  return { queued: messages.length, configured: configured.length };
}

async function enqueueVisibilityProbeRun(env, scheduledDate) {
  const control = await controlState(env);
  if (!control.enabled) return { queued: 0, reason: control.reason };
  if (!isTrue(env.SEARCH_VISIBILITY_PROBES_ENABLED)) return { queued: 0, reason: 'visibility_probes_disabled' };
  const providers = configuredProviders(env);
  if (!providers.length) return { queued: 0, reason: 'no_provider_secrets_configured' };

  const count = clampInt(env.VISIBILITY_PROBES_PER_RUN, 2, 1, 4);
  const probes = probesForDate(scheduledDate, count);
  const day = utcDay(scheduledDate);
  const messages = [];
  for (const probe of probes) {
    const prompt = buildVisibilityProbePrompt(probe);
    const promptFingerprint = await sha256Hex(prompt);
    for (const providerId of providers) {
      if (!providerCanRunProbe(providerId, probe)) continue;
      const usageKey = 'visibility:' + providerId;
      const cap = env.MAX_DAILY_CALLS_PER_VISIBILITY_PROVIDER || '2';
      if (!(await underDailyCap(env, usageKey, day, cap))) continue;
      messages.push({ body: {
        kind: 'visibility_probe',
        day,
        providerId,
        territoryKey: 'search_visibility',
        prompt,
        promptFingerprint,
        taskKey: day + ':visibility:' + providerId + ':' + probe.id + ':' + promptFingerprint.slice(0, 16),
        probe
      }});
    }
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0, 100));
  return { queued: messages.length, providers: providers.length, probes: probes.length };
}
async function enqueueRun(env, scheduledDate) {
  const control = await controlState(env);
  if (!control.enabled) return { queued: 0, reason: control.reason };
  const providers = configuredProviders(env);
  if (!providers.length) return { queued: 0, reason: 'no_provider_secrets_configured' };

  const promptCount = clampInt(env.PROMPTS_PER_RUN, 2, 1, 4);
  const territories = territoriesForDate(scheduledDate, promptCount);
  const day = utcDay(scheduledDate);
  const messages = [];
  for (const territory of territories) {
    const prompt = buildSensorPrompt(territory);
    const promptFingerprint = await sha256Hex(prompt);
    for (const providerId of providers) {
      if (!(await underDailyCap(env, providerId, day))) continue;
      messages.push({ body: {
        kind: 'sensor_query', day, providerId, territoryKey: territory.key,
        prompt, promptFingerprint,
        taskKey: `${day}:${providerId}:${territory.key}:${promptFingerprint.slice(0, 24)}`
      }});
    }
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0, 100));
  return { queued: messages.length, providers: providers.length, territories: territories.length };
}

export default {
  async fetch(request, env) {
    const reviewDecision = await handleBrainReviewDecisionRequest(request, env);
    if (reviewDecision) return reviewDecision;
    const proposal = await handleBrainProposalRequest(request, env);
    if (proposal) return proposal;
    const internal = await handleBrainControlRequest(request, env);
    if (internal) return internal;
    return new Response('Not Found', {
      status: 404,
      headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }
    });
  },

  async scheduled(controller, env, ctx) {
    const when = new Date(controller.scheduledTime);
    const jobs = [
      enqueueOsirisRun(env, when),
      enqueuePublicSourceRun(env, when),
      enqueueSearchVisibilityRun(env, when)
    ];
    if (controller.cron === '17 4 * * *') {
      jobs.push(enqueueRun(env, when));
      jobs.push(enqueueVisibilityProbeRun(env, when));
    }
    ctx.waitUntil(Promise.all(jobs));
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      const task = message.body;
      if (!task || !['sensor_query','source_snapshot','public_source_snapshot','search_visibility_snapshot','visibility_probe'].includes(task.kind)) { message.ack(); continue; }
      try {
        if (task.kind === 'source_snapshot') await processSourceTask(env, task);
        else if (task.kind === 'public_source_snapshot') await processPublicSourceTask(env, task);
        else if (task.kind === 'search_visibility_snapshot') await processSearchVisibilityTask(env, task);
        else if (task.kind === 'visibility_probe') await processVisibilityProbeTask(env, task);
        else await processTask(env, task);
        message.ack();
      } catch (error) {
        console.error('A13 sensor task failed', task.providerId, task.territoryKey, error?.message ?? error);
        message.retry({ delaySeconds: 300 });
      }
    }
  }
};

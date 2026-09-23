import {
  buildSensorPrompt, clampInt, domainOf, isTrue, privacySafeText,
  sha256Hex, territoriesForDate, uniqueCanonicalUrls
} from './core.js';
import { configuredProviders, PROVIDERS } from './providers.js';
import { configuredOsirisSources, fetchOsirisSource, sourceDefinition } from './sources.js';

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
  const groundingState = citations.length ? 'grounded' : 'ungrounded';
  const strength = citations.length >= 3 ? 80 : citations.length >= 1 ? 60 : 25;
  const confidenceClass = citations.length >= 2 ? 'high' : citations.length >= 1 ? 'medium' : 'low';
  const metadata = JSON.stringify({
    a13: true, territory_key: task.territoryKey, provider_id: result.providerId,
    model_id: result.modelId, grounding_state: groundingState,
    independent_evidence_roots: citations.length
  });
  const evidenceFacts = JSON.stringify({
    source_kind: 'external_intelligence',
    territory_key: task.territoryKey,
    provider_id: result.providerId,
    model_id: result.modelId,
    grounding_state: groundingState,
    independent_evidence_roots: citations.length,
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
      VALUES (?,'system',?,NULL,'demand',?,?,?,?,?,?)
    `).bind(
      evidenceId,eventId,observedAt,strength,confidenceClass,payloadHash,evidenceFacts,observedAt
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
    if (!def) continue;
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
  async scheduled(controller, env, ctx) {
    const when = new Date(controller.scheduledTime);
    const jobs = [enqueueOsirisRun(env, when)];
    if (controller.cron === '17 4 * * *') jobs.push(enqueueRun(env, when));
    ctx.waitUntil(Promise.all(jobs));
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      const task = message.body;
      if (!task || !['sensor_query','source_snapshot'].includes(task.kind)) { message.ack(); continue; }
      try {
        if (task.kind === 'source_snapshot') await processSourceTask(env, task);
        else await processTask(env, task);
        message.ack();
      } catch (error) {
        console.error('A13 sensor task failed', task.providerId, task.territoryKey, error?.message ?? error);
        message.retry({ delaySeconds: 300 });
      }
    }
  }
};

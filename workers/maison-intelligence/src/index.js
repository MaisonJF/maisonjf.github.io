import {
  buildSensorPrompt, clampInt, domainOf, isTrue, privacySafeText,
  sha256Hex, territoriesForDate, uniqueCanonicalUrls
} from './core.js';
import { configuredProviders, configuredZeroCostModelSpecs, PROVIDERS } from './providers.js';
import { configuredOsirisSources, fetchOsirisSource, sourceDefinition, osirisSourceDue } from './sources.js';
import { mirrorToOsirisMemory } from './memory.js';
import { configuredPublicSourceTasks, fetchPublicSource, publicSourceDue, publicTaskIdentity } from './public_sources.js';
import { configuredSearchVisibilityTasks, fetchSearchVisibility, searchVisibilityDue, searchVisibilityTaskIdentity } from './search_visibility.js';
import { buildVisibilityProbePrompt, decorateVisibilityResult, probesForDate, providerCanRunProbe } from './visibility_probes.js';
import { handleBrainControlRequest } from './control_api.js';
import { handleBrainProposalRequest } from './proposal_api.js';
import { handleCommercialRecoveryRequest } from './commercial_recovery_api.js';
import { handleBrainReviewDecisionRequest } from './review_decision_api.js';
import { handleA2IngestRequest } from './a2_runtime.js';
import { handleA11LearningRequest } from './a11_runtime.js';
import { handleVideoGenerationRequest } from './video_generation.js';
import { handleMaisonMcpRequest } from './mcp_video.js';
import { handleOceanMemoryRequest, ingestOceanMemory } from './ocean_memory.js';
import { routeOceanContext } from './ocean_context.js';
import { buildEditorialProposal, buildInlineBrainAlert } from './content_proposal.js';
import { generateEditorialCandidates } from './editorial_candidate_generation.js';
import { runExpansionFoundry } from './expansion_foundry.js';
import { runFeedbackCouncil } from './feedback_council.js';

function id(prefix) { return `${prefix}${crypto.randomUUID()}`; }
function utcDay(date = new Date()) { return date.toISOString().slice(0, 10); }

function d1QuotaExhausted(error) {
  const message=String(error?.message || error || '').toLowerCase();
  return message.includes('7500')
    || message.includes('free tier daily row read limit')
    || message.includes('exceeded d1')
    || message.includes('d1 quota');
}

async function controlState(env) {
  if (isTrue(env.KILL_SWITCH) || !isTrue(env.WORKER_ENABLED)) return { enabled: false, reason: 'environment_disabled' };
  const row = await env.GROWTH_DB.prepare(
    `SELECT kill_switch, observe_only FROM external_intelligence_control WHERE control_id='global'`
  ).first();
  if (!row || Number(row.kill_switch) === 1) return { enabled: false, reason: 'database_kill_switch' };
  return { enabled: true, observeOnly: Number(row.observe_only) !== 0 };
}

async function taskGate(env,{taskKey,providerId,day,requestedCap=null}) {
  if (isTrue(env.KILL_SWITCH) || !isTrue(env.WORKER_ENABLED)) {
    return { enabled:false, reason:'environment_disabled' };
  }
  const cap=clampInt(requestedCap ?? env.MAX_DAILY_CALLS_PER_PROVIDER,2,1,200);
  const row=await env.GROWTH_DB.prepare(`
    SELECT
      c.kill_switch,
      c.observe_only,
      EXISTS(
        SELECT 1 FROM external_intelligence_observations o
        WHERE o.task_key=?1 LIMIT 1
      ) AS already_done,
      COALESCE((
        SELECT u.calls FROM external_intelligence_daily_usage u
        WHERE u.usage_date=?2 AND u.provider_id=?3
        LIMIT 1
      ),0) AS calls
    FROM external_intelligence_control c
    WHERE c.control_id='global'
    LIMIT 1
  `).bind(taskKey,day,providerId).first();
  if (!row || Number(row.kill_switch)===1) return { enabled:false, reason:'database_kill_switch' };
  if (Number(row.already_done)===1) return { enabled:false, reason:'duplicate_task' };
  if (Number(row.calls||0)>=cap) return { enabled:false, reason:'daily_cap' };
  return { enabled:true, observeOnly:Number(row.observe_only)!==0 };
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

async function processExpansionFoundryTask(env,task) {
  const control=await controlState(env);
  if (!control.enabled) return { skipped:control.reason };

  const day=task.day||utcDay();
  const usageKey=('foundry:'+String(task.modelKey||task.providerId||'model')).slice(0,120);
  const cap=1;
  const row=await env.GROWTH_DB.prepare(`
    SELECT calls FROM external_intelligence_daily_usage
    WHERE usage_date=?1 AND provider_id=?2
    LIMIT 1
  `).bind(day,usageKey).first();
  if(Number(row?.calls||0)>=cap)return { skipped:'foundry_daily_cap',modelKey:task.modelKey };

  let outcome;
  try{
    outcome=await runExpansionFoundry(env,{spec:task.spec});
    await markUsage(env,usageKey,day,true,outcome.usage);
  }catch(error){
    try{await markUsage(env,usageKey,day,false,null);}catch{}
    throw error;
  }
  return {
    stored:true,
    provider:outcome.provider_id,
    model:outcome.model_id,
    modelKey:outcome.model_key,
    lens:outcome.lens,
    candidates:outcome.stored,
    duplicates:outcome.duplicates,
    rejected:outcome.rejected
  };
}

async function maybeGenerateEditorialCandidates(env,{oceanContext,brainAlert,observedAt}={}) {
  if (!isTrue(env.OCEAN_MEMORY_ENABLED)) return { skipped:'ocean_memory_disabled' };
  if (!oceanContext || !brainAlert) return { skipped:'no_ocean_alert' };
  const priority=Number(brainAlert.ocean_alert_priority ?? brainAlert.strength ?? 0);
  if (!Number.isFinite(priority) || priority < 70) return { skipped:'below_editorial_threshold' };
  if (['descoberta-organica-e-reconhecimento-da-maison','atelier-principios-transferiveis-e-dna-maison'].includes(oceanContext.oceanKey)) {
    return { skipped:'strategic_ocean_no_paid_body' };
  }
  if (!isTrue(env.OPENROUTER_ENABLED) || !env.OPENROUTER_API_KEY || !PROVIDERS.openrouter) {
    return { skipped:'zero_cost_editorial_provider_unavailable' };
  }

  const day=utcDay(observedAt ? new Date(observedAt) : new Date());
  const usageKey='editorial_candidates:openrouter';
  const cap=2;
  const row=await env.GROWTH_DB.prepare(`
    SELECT calls
    FROM external_intelligence_daily_usage
    WHERE usage_date=? AND provider_id=?
    LIMIT 1
  `).bind(day,usageKey).first();
  if (Number(row?.calls||0) >= cap) return { skipped:'editorial_daily_cap' };

  try {
    const outcome=await generateEditorialCandidates(env,{
      caller:PROVIDERS.openrouter,
      oceanContext,
      brainAlert,
      providerId:'openrouter'
    });
    await markUsage(env,usageKey,day,true,outcome.usage);
    console.info('MAISON_EDITORIAL_CANDIDATES',JSON.stringify({
      ocean_key:oceanContext.oceanKey,
      stored:outcome.stored,
      duplicates:outcome.duplicates,
      rejected:outcome.rejected,
      provider:outcome.provider_id,
      model:outcome.model_id
    }));
    return outcome;
  } catch (error) {
    try { await markUsage(env,usageKey,day,false,null); } catch {}
    console.error('MAISON_EDITORIAL_CANDIDATE_GENERATION_FAILED',oceanContext.oceanKey,error?.message??error);
    return { failed:true,error:error?.message||'editorial_candidate_generation_failed' };
  }
}

async function persistObservation(env, task, result) {
  const safeText = privacySafeText(result.text);
  if (!safeText) throw new Error('empty_provider_response');
  const citations = uniqueCanonicalUrls(result.citations ?? []);
  const oceanContext=routeOceanContext({
    text:safeText,
    territoryKey:task.territoryKey,
    providerId:result.providerId,
    citations
  });
  const brainTerritoryKey=oceanContext?.oceanKey || task.territoryKey;
  const responseHash = await sha256Hex(safeText);
  const payloadHash = await sha256Hex(JSON.stringify({
    provider: result.providerId, model: result.modelId, territory: brainTerritoryKey,
    sourceTerritory:task.territoryKey,responseHash, citations
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
  const inlineBrainAlert=buildInlineBrainAlert({
    oceanContext,
    observationId,
    evidenceId,
    summary:safeText,
    observedAt
  });
  // Build the editorial proposal only after Ocean Memory has applied its alert
  // gate. This keeps OSIRIS -> Oceans -> Brain -> Content as one inline push path
  // and prevents pre-gate proposals from being persisted accidentally.
  const metadataBase={
    a13:true,
    territory_key:brainTerritoryKey,
    source_territory_key:task.territoryKey,
    provider_id:result.providerId,
    model_id:result.modelId,
    grounding_state:groundingState,
    independent_evidence_roots:independentEvidenceRoots,
    source_kind:sourceKind,
    ocean_context:oceanContext ? {
      ocean_key:oceanContext.oceanKey,
      match_terms:oceanContext.matchedTerms,
      relevance_score:oceanContext.relevanceScore,
      commercial_score:oceanContext.commercialScore
    } : null
  };
  const metadata = JSON.stringify({
    ...metadataBase,
    content_proposal:null
  });
  const evidenceFacts = JSON.stringify({
    source_kind: sourceKind,
    territory_key: brainTerritoryKey,
    source_territory_key: task.territoryKey,
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
      brainTerritoryKey,task.promptFingerprint,responseHash,groundingState,safeText,
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

  let oceanMemory=null;
  if(oceanContext && String(env.OCEAN_MEMORY_ENABLED ?? '').toLowerCase()==='true'){
    try{
      oceanMemory=await ingestOceanMemory(env,{
        kind:oceanContext.kind,
        ocean_key:oceanContext.oceanKey,
        canonical_ocean_id:oceanContext.canonicalOceanId,
        source_ref:'a13:'+observationId,
        source_observation_id:observationId,
        summary:safeText.slice(0,4000),
        evidence_roots:oceanContext.evidenceRoots,
        theme_candidates:oceanContext.matchedTerms,
        commercial_adjacency:[{
          source:'live_intelligence',
          provider_id:result.providerId,
          source_territory:task.territoryKey
        }],
        relevance_score:oceanContext.relevanceScore,
        commercial_score:oceanContext.commercialScore,
        observed_at:observedAt
      });
      if(oceanMemory?.brain_alert){
        console.info('MAISON_BRAIN_ALERT',JSON.stringify({
          ocean_key:oceanContext.oceanKey,
          priority:oceanMemory.brain_alert.ocean_alert_priority,
          alert_kind:oceanMemory.brain_alert.ocean_alert_kind,
          observation_id:observationId
        }));
      }
    }catch(error){
      console.error('Ocean inline context failed',observationId,error?.message ?? error);
    }
  }

  const brainAlert=oceanMemory?.brain_alert || inlineBrainAlert || null;
  const contentProposal=await buildEditorialProposal({
    brainAlert,
    oceanContext
  });
  if(contentProposal){
    // Persist the proposal onto the event Brain already reads. This is one small
    // UPDATE in the same producer execution, not a new queue, cron or D1 poll.
    await env.GROWTH_DB.prepare(`
      UPDATE events
      SET metadata_json=?
      WHERE event_id=?
    `).bind(JSON.stringify({
      ...metadataBase,
      content_proposal:contentProposal
    }),eventId).run();
    console.info('MAISON_CONTENT_PROPOSAL',JSON.stringify({
      proposal_id:contentProposal.proposal_id,
      ocean_key:oceanContext.oceanKey,
      priority:contentProposal.source.priority,
      priority_band:contentProposal.editorial_decision.priority_band,
      format:contentProposal.editorial_decision.format
    }));
  }

  const editorialCandidates=await maybeGenerateEditorialCandidates(env,{
    oceanContext,
    brainAlert,
    observedAt
  });

  return {
    observationId,eventId,evidenceId,
    territoryKey:brainTerritoryKey,
    sourceTerritoryKey:task.territoryKey,
    oceanContext,
    brainAlert,
    contentProposal,
    editorialCandidates
  };
}

async function processSourceTask(env, task) {
  const day=task.day || utcDay();
  const gate=await taskGate(env,{
    taskKey:task.taskKey,
    providerId:task.providerId,
    day,
    requestedCap:env.MAX_DAILY_CALLS_PER_OSIRIS_SOURCE || '24'
  });
  if (!gate.enabled) return { skipped:gate.reason };

  let result;
  try {
    result = await fetchOsirisSource(env, task.sourceKey);
    await markUsage(env, task.providerId, day, true, null);
  } catch (error) {
    await markUsage(env, task.providerId, day, false, null);
    throw error;
  }

  const persisted=await persistObservation(env,task,result);
  return {
    stored:true,provider:task.providerId,territory:persisted.territoryKey,
    sourceTerritory:persisted.sourceTerritoryKey,
    brainAlert:persisted.brainAlert,
    contentProposal:persisted.contentProposal
  };
}

async function processPublicSourceTask(env, task) {
  const day=task.day || utcDay();
  const gate=await taskGate(env,{
    taskKey:task.taskKey,
    providerId:task.providerId,
    day,
    requestedCap:env.MAX_DAILY_CALLS_PER_PUBLIC_SOURCE || '4'
  });
  if (!gate.enabled) return { skipped:gate.reason };

  let result;
  try {
    result = await fetchPublicSource(env, task.publicTask);
    await markUsage(env, task.providerId, day, true, result.usage);
  } catch (error) {
    await markUsage(env, task.providerId, day, false, null);
    throw error;
  }
  const persisted=await persistObservation(env,task,result);
  return {
    stored:true,provider:task.providerId,territory:persisted.territoryKey,
    sourceTerritory:persisted.sourceTerritoryKey,brainAlert:persisted.brainAlert
  };
}

async function processSearchVisibilityTask(env, task) {
  const day=task.day || utcDay();
  const usageKey='search:'+task.providerId;
  const gate=await taskGate(env,{
    taskKey:task.taskKey,
    providerId:usageKey,
    day,
    requestedCap:env.MAX_DAILY_CALLS_PER_SEARCH_SOURCE || '10'
  });
  if (!gate.enabled) return { skipped:gate.reason };

  let result;
  try {
    result = await fetchSearchVisibility(env, task.searchTask, new Date(task.scheduledAt));
    await markUsage(env, usageKey, day, true, result.usage);
  } catch (error) {
    await markUsage(env, usageKey, day, false, null);
    throw error;
  }
  const persisted=await persistObservation(env,task,result);
  return {
    stored:true,provider:task.providerId,territory:persisted.territoryKey,
    sourceTerritory:persisted.sourceTerritoryKey,brainAlert:persisted.brainAlert
  };
}

async function processVisibilityProbeTask(env, task) {
  const day=task.day || utcDay();
  const usageKey='visibility:'+task.providerId;
  const gate=await taskGate(env,{
    taskKey:task.taskKey,
    providerId:usageKey,
    day,
    requestedCap:env.MAX_DAILY_CALLS_PER_VISIBILITY_PROVIDER || '2'
  });
  if (!gate.enabled) return { skipped:gate.reason };
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
  const persisted=await persistObservation(env,task,result);
  return {
    stored:true,provider:task.providerId,territory:persisted.territoryKey,
    sourceTerritory:persisted.sourceTerritoryKey,
    probe:task.probe.id,
    brainAlert:persisted.brainAlert,
    contentProposal:persisted.contentProposal
  };
}
async function processTask(env, task) {
  const day=task.day || utcDay();
  const gate=await taskGate(env,{
    taskKey:task.taskKey,
    providerId:task.providerId,
    day
  });
  if (!gate.enabled) return { skipped:gate.reason };
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
  const persisted=await persistObservation(env,task,result);
  return {
    stored:true,provider:task.providerId,territory:persisted.territoryKey,
    sourceTerritory:persisted.sourceTerritoryKey,brainAlert:persisted.brainAlert
  };
}

async function enqueueOsirisRun(env,scheduledDate,getControl=()=>controlState(env)) {
  const sourceKeys=configuredOsirisSources(env);
  if (!sourceKeys.length) return { queued:0,reason:'osiris_disabled_or_no_sources' };
  const due=sourceKeys.filter(sourceKey=>{
    const def=sourceDefinition(sourceKey);
    return Boolean(def && osirisSourceDue(env,sourceKey,scheduledDate));
  });
  if (!due.length) return { queued:0,reason:'no_sources_due',sources:sourceKeys.length };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const day=utcDay(scheduledDate);
  const hour=scheduledDate.toISOString().slice(0,13);
  const messages=[];
  for (const sourceKey of due) {
    const def=sourceDefinition(sourceKey);
    const providerId=`osiris_${sourceKey}`;
    const promptFingerprint=await sha256Hex(`${env.OSIRIS_BASE_URL || 'https://osirisai.live'}${def.path}`);
    messages.push({body:{
      kind:'source_snapshot',
      day,
      providerId,
      sourceKey,
      territoryKey:def.territoryKey,
      prompt:`Passive OSIRIS source snapshot: ${sourceKey}`,
      promptFingerprint,
      taskKey:`${hour}:osiris:${sourceKey}`
    }});
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return { queued:messages.length,sources:sourceKeys.length,due:due.length };
}
async function enqueuePublicSourceRun(env,scheduledDate,getControl=()=>controlState(env)) {
  const configured=configuredPublicSourceTasks(env);
  if (!configured.length) return { queued:0,reason:'public_sources_disabled_or_unconfigured' };
  const due=configured.filter(task=>publicSourceDue(task,scheduledDate));
  if (!due.length) return { queued:0,reason:'no_public_sources_due',configured:configured.length };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const day=utcDay(scheduledDate);
  const hour=scheduledDate.toISOString().slice(0,13);
  const messages=[];
  for (const publicTask of due) {
    const providerId=publicTask.providerId;
    const promptFingerprint=await sha256Hex(publicTaskIdentity(publicTask));
    messages.push({body:{
      kind:'public_source_snapshot',
      day,
      providerId,
      territoryKey:publicTask.territoryKey,
      prompt:`Public source snapshot: ${publicTask.family}/${publicTask.key}`,
      promptFingerprint,
      taskKey:`${hour}:public:${publicTask.family}:${publicTask.key}`,
      publicTask
    }});
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return { queued:messages.length,configured:configured.length,due:due.length };
}
async function enqueueSearchVisibilityRun(env,scheduledDate,getControl=()=>controlState(env)) {
  const configured=configuredSearchVisibilityTasks(env);
  if (!configured.length) return { queued:0,reason:'search_visibility_disabled_or_unconfigured' };
  const due=configured.filter(task=>searchVisibilityDue(task,scheduledDate));
  if (!due.length) return { queued:0,reason:'no_search_visibility_due',configured:configured.length };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const day=utcDay(scheduledDate);
  const hour=scheduledDate.toISOString().slice(0,13);
  const messages=[];
  for (const searchTask of due) {
    const promptFingerprint=await sha256Hex(searchVisibilityTaskIdentity(searchTask));
    messages.push({body:{
      kind:'search_visibility_snapshot',
      day,
      providerId:searchTask.providerId,
      territoryKey:searchTask.territoryKey,
      prompt:'Search visibility snapshot: '+searchTask.key,
      promptFingerprint,
      taskKey:hour+':search:'+searchTask.providerId+':'+searchTask.key,
      scheduledAt:scheduledDate.toISOString(),
      searchTask
    }});
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return { queued:messages.length,configured:configured.length,due:due.length };
}
async function enqueueVisibilityProbeRun(env,scheduledDate,getControl=()=>controlState(env)) {
  if (!isTrue(env.SEARCH_VISIBILITY_PROBES_ENABLED)) return { queued:0,reason:'visibility_probes_disabled' };
  const providers=configuredProviders(env);
  if (!providers.length) return { queued:0,reason:'no_provider_secrets_configured' };

  const count=clampInt(env.VISIBILITY_PROBES_PER_RUN,2,1,4);
  const probes=probesForDate(scheduledDate,count);
  const eligible=[];
  for (const probe of probes) {
    const prompt=buildVisibilityProbePrompt(probe);
    const promptFingerprint=await sha256Hex(prompt);
    for (const providerId of providers) {
      if (!providerCanRunProbe(providerId,probe)) continue;
      eligible.push({probe,prompt,promptFingerprint,providerId});
    }
  }
  if (!eligible.length) return { queued:0,reason:'no_eligible_visibility_probes',providers:providers.length,probes:probes.length };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const day=utcDay(scheduledDate);
  const messages=eligible.map(({probe,prompt,promptFingerprint,providerId})=>({body:{
    kind:'visibility_probe',
    day,
    providerId,
    territoryKey:'search_visibility',
    prompt,
    promptFingerprint,
    taskKey:day+':visibility:'+providerId+':'+probe.id+':'+promptFingerprint.slice(0,16),
    probe
  }}));
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return { queued:messages.length,providers:providers.length,probes:probes.length };
}
async function enqueueDailyExpansionRun(env,scheduledDate,getControl=()=>controlState(env)) {
  const specs=configuredZeroCostModelSpecs(env);
  if (!specs.length) return { queued:0,reason:'no_zero_cost_models_configured' };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const day=utcDay(scheduledDate);
  const messages=[];
  for(const spec of specs){
    const fingerprint=await sha256Hex(spec.key);
    messages.push({body:{
      kind:'expansion_foundry',
      day,
      providerId:spec.providerId,
      modelKey:spec.key,
      spec,
      territoryKey:'maison_expansion',
      promptFingerprint:fingerprint,
      taskKey:`${day}:foundry:${fingerprint.slice(0,24)}`
    }});
  }
  if(messages.length)await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return {queued:messages.length,models:specs.length};
}

async function enqueueRun(env,scheduledDate,getControl=()=>controlState(env)) {
  const providers=configuredProviders(env);
  if (!providers.length) return { queued:0,reason:'no_provider_secrets_configured' };

  const control=await getControl();
  if (!control.enabled) return { queued:0,reason:control.reason };

  const promptCount=clampInt(env.PROMPTS_PER_RUN,2,1,4);
  const territories=territoriesForDate(scheduledDate,promptCount);
  const day=utcDay(scheduledDate);
  const messages=[];
  for (const territory of territories) {
    const prompt=buildSensorPrompt(territory);
    const promptFingerprint=await sha256Hex(prompt);
    for (const providerId of providers) {
      messages.push({body:{
        kind:'sensor_query',day,providerId,territoryKey:territory.key,
        prompt,promptFingerprint,
        taskKey:`${day}:${providerId}:${territory.key}:${promptFingerprint.slice(0,24)}`
      }});
    }
  }
  if (messages.length) await env.INTELLIGENCE_QUEUE.sendBatch(messages.slice(0,100));
  return { queued:messages.length,providers:providers.length,territories:territories.length };
}
export default {
  async fetch(request, env) {
    const mcp = await handleMaisonMcpRequest(request, env);
    if (mcp) return mcp;
    const oceans = await handleOceanMemoryRequest(request, env);
    if (oceans) return oceans;
    const video = await handleVideoGenerationRequest(request, env);
    if (video) return video;
    const a11 = await handleA11LearningRequest(request, env);
    if (a11) return a11;
    const a2 = await handleA2IngestRequest(request, env);
    if (a2) return a2;
    const reviewDecision = await handleBrainReviewDecisionRequest(request, env);
    if (reviewDecision) return reviewDecision;
    const recovery = await handleCommercialRecoveryRequest(request, env);
    if (recovery) return recovery;
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
    const when=new Date(controller.scheduledTime);
    let controlPromise=null;
    const getControl=()=>controlPromise ||= controlState(env);
    const jobs=[
      enqueueOsirisRun(env,when,getControl),
      enqueuePublicSourceRun(env,when,getControl),
      enqueueSearchVisibilityRun(env,when,getControl)
    ];
    // The Worker itself already runs every three hours. Feed the human/Ocean
    // research loop on every natural cadence instead of once per day; task keys
    // and provider caps remain the idempotency/cost gates.
    jobs.push(enqueueRun(env,when,getControl));
    // Visibility probes are deliberately lower cadence: discovery/content growth
    // is continuous, while search-presence measurement stays daily.
    if (when.getUTCHours()===3 && when.getUTCMinutes()===0) {
      jobs.push(enqueueVisibilityProbeRun(env,when,getControl));
      if (isTrue(env.FEEDBACK_COUNCIL_ENABLED)) jobs.push(runFeedbackCouncil(env,{date:when,reviews:env.FEEDBACK_COUNCIL_REVIEWS_PER_DAY||2}));
    }
    // Every scheduler tick may ask the zero-cost Foundry to run. The per-model
    // daily usage gate keeps this to at most the configured daily cap, so a
    // deployment after 06:00 UTC no longer leaves the Vault empty until tomorrow.
    // Outputs remain private candidates and never self-publish.
    jobs.push(enqueueDailyExpansionRun(env,when,getControl));
    ctx.waitUntil(Promise.all(jobs));
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      const task = message.body;
      if (!task || !['sensor_query','source_snapshot','public_source_snapshot','search_visibility_snapshot','visibility_probe','expansion_foundry'].includes(task.kind)) { message.ack(); continue; }
      try {
        let outcome;
        if (task.kind === 'source_snapshot') outcome=await processSourceTask(env,task);
        else if (task.kind === 'expansion_foundry') outcome=await processExpansionFoundryTask(env,task);
        else if (task.kind === 'public_source_snapshot') outcome=await processPublicSourceTask(env,task);
        else if (task.kind === 'search_visibility_snapshot') outcome=await processSearchVisibilityTask(env,task);
        else if (task.kind === 'visibility_probe') outcome=await processVisibilityProbeTask(env,task);
        else outcome=await processTask(env,task);
        if(outcome?.brainAlert){
          console.info('MAISON_BRAIN_INLINE_DELIVERY',JSON.stringify({
            territory:outcome.territory,
            source_territory:outcome.sourceTerritory,
            alert_kind:outcome.brainAlert.ocean_alert_kind,
            priority:outcome.brainAlert.ocean_alert_priority,
            content_proposal_id:outcome.contentProposal?.proposal_id || null,
            content_priority_band:outcome.contentProposal?.editorial_decision?.priority_band || null
          }));
        }
        message.ack();
      } catch (error) {
        console.error('A13 sensor task failed', task.providerId, task.territoryKey, error?.message ?? error);
        if (d1QuotaExhausted(error)) {
          console.warn('A13 task dropped until next natural cadence because D1 daily quota is exhausted.');
          message.ack();
          continue;
        }
        message.retry({ delaySeconds: 300 });
      }
    }
  }
};

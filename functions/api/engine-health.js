import { requireMaisonVault } from '../_lib/maison-vault.js';
import { vaultExperienceEngineReady, listActiveOracleBlocks, summarizeExperienceCatalogue } from '../_lib/maison-vault-v2.js';
import { listActivePaidQuestionsV2 } from '../_lib/question-vault-v2.js';
import { composeQuestionSession } from '../_lib/question-composer.js';
import { composeOracleReading } from '../_lib/oracle-composer.js';
import { vaultLocalizationReady } from '../_lib/maison-localized-content.js';

const ORACLE_ROLES=['opening','recognition','tension','counterpoint','reframe','movement','close'];

export async function onRequestGet({env}){
  const started=Date.now();
  let stage='binding';
  try{
    const db=requireMaisonVault(env);
    stage='schema';
    const schemaReady=await vaultExperienceEngineReady(db);
    if(!schemaReady){
      return json({ok:false,schema:'not_vault_v2_or_v3',latency_ms:Date.now()-started},503);
    }
    stage='localization';
    const localized=await vaultLocalizationReady(db);

    stage='game';
    const pdi=await checkPdi(db);
    stage='oracle';
    const oracleAmor=await checkOracleAmor(db);
    stage='catalogue';
    const catalogue=await summarizeExperienceCatalogue(db);
    stage='locale_coverage';
    const gameLocaleCoverage=await Promise.all(['pt-PT','pt-BR','en','es'].map(async locale=>{
      try{const pool=await listActivePaidQuestionsV2(db,'*',locale);return {locale,active_questions:pool.length,minimum_16:pool.length>=16};}
      catch{return {locale,active_questions:null,minimum_16:false};}
    }));

    return json({
      ok:pdi.ok&&oracleAmor.ok,
      schema:localized?'vault_v3':'vault_v2',
      localization:{
        ready:localized,
        schema_ready:localized,
        readiness_scope:'schema_only',
        source_locale:'pt-PT',
        target_locales:['pt-BR','en','es'],
        content_coverage:'validated_per_checkout'
      },
      pdi,
      game_locale_coverage:gameLocaleCoverage,
      oracle:{
        amor:oracleAmor,
        incomplete_territories_use_legacy_fallback:true
      },
      catalogue,
      privacy:{
        answer_text_stored:false,
        private_conversation_stored:false
      },
      latency_ms:Date.now()-started
    },pdi.ok&&oracleAmor.ok?200:503);
  }catch(error){
    const code=error?.code==='MAISON_VAULT_UNAVAILABLE'?'binding_unavailable':'health_check_failed';
    console.error('[engine-health] failure',{stage,code,name:String(error?.name||'Error')});
    return json({ok:false,error:code,stage,latency_ms:Date.now()-started},503);
  }
}

async function checkPdi(db){
  try{
    const questions=await listActivePaidQuestionsV2(db,'*');
    const composed=composeQuestionSession({
      theme:'*',
      seed:'maison-health-pdi-v2',
      questions,
      seenIds:[]
    });
    return {
      ok:composed?.packA?.length===8&&composed?.packB?.length===8,
      active_questions:questions.length,
      composed_cards:(composed?.packA?.length||0)+(composed?.packB?.length||0),
      engine_version:composed?.engineVersion||null,
      quality_score:composed?.qualityScore??null
    };
  }catch(error){
    return {ok:false,error:safeCode(error),active_questions:0};
  }
}

async function checkOracleAmor(db){
  try{
    const blocks=await listActiveOracleBlocks(db,'amor');
    const specificRoles=new Set(blocks.filter(b=>b.territory==='amor').map(b=>b.role));
    const roleCoverage=ORACLE_ROLES.every(role=>specificRoles.has(role));
    if(!roleCoverage){
      return {ok:false,error:'incomplete_role_coverage',active_blocks:blocks.length};
    }
    const composed=composeOracleReading({
      territory:'amor',
      seed:'maison-health-oracle-amor-v2',
      blocks,
      seenIds:[]
    });
    return {
      ok:!!composed?.text&&composed?.quality?.ok!==false,
      active_blocks:blocks.length,
      role_coverage:ORACLE_ROLES.length,
      engine_version:composed?.engineVersion||null,
      quality_score:composed?.quality?.score??null
    };
  }catch(error){
    return {ok:false,error:safeCode(error),active_blocks:0};
  }
}

function safeCode(error){
  const value=String(error?.message||'engine_error');
  return /^[a-z0-9_:-]+$/i.test(value)?value:'engine_error';
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}

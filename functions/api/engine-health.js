import { requireMaisonVault } from '../_lib/maison-vault.js';
import { vaultExperienceEngineReady, listActiveOracleBlocks, summarizeExperienceCatalogue } from '../_lib/maison-vault-v2.js';
import { listActivePaidQuestionsV2 } from '../_lib/question-vault-v2.js';
import { composeQuestionSession } from '../_lib/question-composer.js';
import { composeOracleReading } from '../_lib/oracle-composer.js';
import { vaultLocalizationReady } from '../_lib/maison-localized-content.js';

const LOCALES=['pt-PT','pt-BR','en','es'];

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

    if(!localized)return json({ok:false,schema:'not_vault_v3',error:'localization_schema_unavailable',latency_ms:Date.now()-started},503);

    stage='game';
    const pdi=await checkLocales(locale=>checkPdi(db,locale));
    stage='oracle';
    const oracleAmor=await checkLocales(locale=>checkOracleAmor(db,locale));
    stage='catalogue';
    const catalogue=await summarizeExperienceCatalogue(db);
    const ok=LOCALES.every(locale=>pdi[locale].ok&&oracleAmor[locale].ok);

    return json({
      ok,
      schema:'vault_v3',
      localization:{
        ready:localized,
        schema_ready:localized,
        readiness_scope:'schema_only',
        source_locale:'pt-PT',
        target_locales:['pt-BR','en','es'],
        content_coverage:'validated_per_checkout'
      },
      pdi:pdi['pt-PT'],
      game_locale_coverage:LOCALES.map(locale=>({locale,...pdi[locale],minimum_16:pdi[locale].active_questions>=16})),
      oracle:{amor:oracleAmor['pt-PT'],locale_coverage:oracleAmor},
      catalogue,
      privacy:{
        answer_text_stored:false,
        private_conversation_stored:false
      },
      latency_ms:Date.now()-started
    },ok?200:503);
  }catch(error){
    const code=error?.code==='MAISON_VAULT_UNAVAILABLE'?'binding_unavailable':'health_check_failed';
    console.error('[engine-health] failure',{stage,code,name:String(error?.name||'Error')});
    return json({ok:false,error:code,stage,latency_ms:Date.now()-started},503);
  }
}

async function checkLocales(check){
  return Object.fromEntries(await Promise.all(LOCALES.map(async locale=>[locale,await check(locale)])));
}

async function checkPdi(db,locale){
  try{
    const questions=await listActivePaidQuestionsV2(db,'*',locale);
    const composed=composeQuestionSession({
      theme:'*',
      seed:'maison-health-pdi-v3',
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

async function checkOracleAmor(db,locale){
  try{
    const blocks=await listActiveOracleBlocks(db,'amor',locale);
    const composed=composeOracleReading({
      territory:'amor',
      seed:'maison-health-oracle-amor-v3',
      locale,
      blocks,
      seenIds:[]
    });
    return {
      ok:!!composed?.text&&composed.blocks.length===1&&composed.quality?.ok===true,
      active_blocks:blocks.length,
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

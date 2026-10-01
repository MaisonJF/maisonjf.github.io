#!/usr/bin/env node
import crypto from 'node:crypto';
import { VPC_OCEAN_SIGNALS } from '../../../functions/_lib/vpc-ocean-signals.generated.js';

const ORACLE_IDS=new Set([
'adiar-o-sono-para-recuperar-autonomia','ansiedade-antecipatoria-na-transicao-domingo-semana','atencao-fragmentada-por-interrupcoes-digitais','auto-silenciamento-para-preservar-o-vinculo','autonomia-condicionada-pelo-medo-da-reaccao','carga-mental-invisivel-da-casa','cuidar-sem-desaparecer-no-papel-de-cuidador','culpa-ao-descansar-como-se-o-descanso-tivesse-de-ser-merecido','doomscrolling-para-tentar-reduzir-incerteza','evitamento-financeiro-sob-escassez','ficar-em-suspenso-enquanto-se-espera-uma-resposta-importante','luto-por-um-futuro-que-deixou-de-ser-possivel','micro-luxo-como-recompensa-e-ritual','perda-ambigua-sem-fecho-claro','precisar-de-solidao-para-recuperar-energia-social','presenca-que-ampara-sem-tentar-resolver','pressao-social-para-gastar-e-vergonha-de-dizer-nao','quando-o-que-funciona-na-relacao-se-torna-invisivel','rituais-sensoriais-com-plantas-como-marcadores-de-transicao','sobrecarga-de-escolha-quando-mais-opcoes-paralisam','solidao-com-contacto-sem-conexao-de-qualidade','telepressao-e-disponibilidade-permanente'
]);

const sq=v=>v==null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const sj=v=>sq(JSON.stringify(v));
const sha40=v=>crypto.createHash('sha256').update(String(v).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()).digest('hex').slice(0,40);
const dec=(kind,id)=>'dec_seed_'+crypto.createHash('sha256').update(kind+':'+id).digest('hex').slice(0,28);
function qtext(theme,variant){const t=String(theme||'o que está a acontecer').trim();return variant===1?'Quando aparece a sensação de «'+t+'», o que costumas fazer primeiro — aproximar-te do que precisas ou afastar-te disso?':'Se «'+t+'» não precisasse de ser resolvido já, o que gostarias de perceber melhor sobre ti nessa situação?';}
function otext(signal){const pain=String(signal?.painLanguage||'').trim();return pain+' Antes de tentares resolver isto, repara no que estás a proteger, no que estás a adiar e no que já sabes mas tens evitado nomear. O movimento não é forçar uma resposta; é tornar mais claro o lugar de onde estás a escolher.';}

const out=['-- Runtime-generated baseline from existing Oceans.','-- Candidate only; never activates content.'];
for(let i=0;i<VPC_OCEAN_SIGNALS.length;i++){
  const s=VPC_OCEAN_SIGNALS[i], ocean=String(s.id), themes=Array.isArray(s.themes)?s.themes:[];
  for(const variant of [1,2]){
    const theme=String(themes[variant-1]||themes[0]||ocean).slice(0,120), body=qtext(theme,variant), fp=sha40(body), id='q_seed_'+ocean+'_'+variant, stage=variant===1?'recognize':'deepen';
    out.push(
      'INSERT INTO vault_questions (question_id,canonical_key,theme,text,subthemes_json,class,stage,intensity,direction,time_scope,exposure,status,scores_json,viral_json,conflicts_json,pairs_json,similarity_group,source_kind,pain_family,subterritory,target,emotional_function,cognitive_load,vulnerability,conflict_potential,playfulness,semantic_fingerprint,compatibility_json,product_fit_json,lifecycle_state,rotation_state,source_ocean_id,quality_version) '+
      'SELECT '+[sq(id),sq('seed:'+ocean+':q'+variant),sq(theme),sq(body),sj(themes.slice(0,8)),sq('mirror'),sq(stage),'2',sq('either'),sq('timeless'),sq('paid'),sq('candidate'),sj({clarity:4,conversationValue:4,safety:5,editorialQuality:3,humanity:4,composability:4}),sq('{}'),sq('[]'),sq('[]'),sq(ocean),sq('ocean_seed_candidate'),sq(theme),sq(theme),sq('both'),sq('discovery'),'2','2','2','2',sq(fp),sq('{}'),sj({para_de_ignorar:1,source:'ocean_seed'}),sq('candidate'),sq('new'),sq(ocean),sq('ocean-seed-v1')].join(',')+
      ' WHERE NOT EXISTS (SELECT 1 FROM vault_questions WHERE question_id='+sq(id)+' OR semantic_fingerprint='+sq(fp)+');'
    );
    out.push(
      'INSERT OR IGNORE INTO vault_editorial_decisions (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version) SELECT '+
      [sq(dec('question',id)),sq('question'),sq(id),sq('propose'),sq('ocean_seed_candidate'),sj({source_ocean_id:ocean,seed:true}),sq('ocean-seed-v1')].join(',')+
      ' WHERE EXISTS (SELECT 1 FROM vault_questions WHERE question_id='+sq(id)+');'
    );
  }
  if(ORACLE_IDS.has(ocean)){
    const body=otext(s), fp=sha40(body), id='ob_seed_'+ocean, role=i%2===0?'recognition':'reframe', title=String(themes[0]||ocean).slice(0,180);
    out.push(
      'INSERT INTO vault_oracle_blocks (block_id,canonical_key,territory,role,intensity,text,status,compatibility_json,scores_json,source_kind,title,pain_family,subterritory,tone,emotional_function,semantic_fingerprint,tags_json,product_fit_json,lifecycle_state,rotation_state,rarity,source_ocean_id,quality_version) '+
      'SELECT '+[sq(id),sq('seed:'+ocean+':oracle'),sq(ocean),sq(role),'2',sq(body),sq('candidate'),sq('{}'),sj({clarity:4,safety:5,editorialQuality:3,humanity:4,composability:4}),sq('ocean_seed_candidate'),sq(title),sq(ocean),sq(title),sq('intimate'),sq('recognition'),sq(fp),sj(themes.slice(0,12)),sj({oracle:1,source:'ocean_seed'}),sq('candidate'),sq('new'),sq('common'),sq(ocean),sq('ocean-seed-v1')].join(',')+
      ' WHERE NOT EXISTS (SELECT 1 FROM vault_oracle_blocks WHERE block_id='+sq(id)+' OR semantic_fingerprint='+sq(fp)+');'
    );
    out.push(
      'INSERT OR IGNORE INTO vault_editorial_decisions (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version) SELECT '+
      [sq(dec('oracle_block',id)),sq('oracle_block'),sq(id),sq('propose'),sq('ocean_seed_candidate'),sj({source_ocean_id:ocean,seed:true}),sq('ocean-seed-v1')].join(',')+
      ' WHERE EXISTS (SELECT 1 FROM vault_oracle_blocks WHERE block_id='+sq(id)+');'
    );
  }
}
process.stdout.write(out.join('\n')+'\n');

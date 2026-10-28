import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');

test('PÁRA DE IGNORAR exposes a separately signed two-player or group mode',()=>{
  const checkout=read('functions/api/create-pdi-checkout-live.js');
  const session=read('functions/api/pdi-session-live.js');
  assert.match(checkout,/const mode=String\(body\?\.mode\|\|'duo'\)/);
  assert.match(checkout,/!\['duo','group'\]\.includes\(mode\)/);
  assert.match(checkout,/metadata\[pdi_mode\]/);
  assert.match(checkout,/encodeURIComponent\(mode\)/);
  assert.match(session,/stripeSession\.metadata\?\.pdi_mode/);
  assert.match(session,/mode,/);
});

test('group themes retain canonical and legacy Vault keys, and existing live questions remain discoverable',()=>{
  const sources=read('functions/_lib/pdi-theme-sources.js');
  const registry=read('functions/_lib/pdi-theme-registry.js');
  const catalogue=read('functions/_lib/pdi-theme-catalogue.js');
  const localized=read('functions/_lib/maison-localized-content.js');
  const vaultV1=read('functions/_lib/maison-vault.js');
  const vaultV2=read('functions/_lib/question-vault-v2.js');
  const session=read('functions/_lib/para-de-ignorar-session.js');
  assert.match(sources,/label:signal\.label\|\|''/);
  assert.match(registry,/find\(item=>item\.source==='pdi-group'\)/);
  assert.match(registry,/groupEvidence\?\.sourceId\|\|stableThemeSlug\(label\)/);
  assert.match(registry,/family:String\(groupEvidence\?\.family\|\|evidence\.family\|\|'Maison'\)/);
  assert.match(registry,/item\.slug===key\|\|item\.aliases\.includes\(key\)/);
  assert.match(catalogue,/keys\.reduce\(\(total,key\)=>total\+\(counts\.get\(key\)\|\|0\),0\)/);
  assert.match(localized,/WHERE theme IN \(\$\{placeholders\}\)/);
  assert.match(vaultV1,/WHERE theme IN \(\$\{placeholders\}\)/);
  assert.match(vaultV2,/WHERE q\.theme IN \(\$\{placeholders\}\)/);
  assert.match(session,/registeredTheme\?\.aliases/);
});

test('group mode focuses on 12 packs and requires 28 live questions before exposure',()=>{
  const sources=read('functions/_lib/pdi-theme-sources.js');
  const catalogue=read('functions/_lib/pdi-theme-catalogue.js');
  const policy=read('functions/_lib/para-de-ignorar-policy.js');
  assert.match(sources,/const PDI_GROUP_SEEDS=\[/);
  assert.match(sources,/family:'Amigos, Grupos & Festas'/);
  assert.match(sources,/source:'pdi-group'/);
  assert.match(catalogue,/liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS/);
  assert.match(policy,/minimum_28_active_approved_questions_per_theme/);
  const builder=read('.github/maison-growth/brain/build_pdi_expansion_queue.mjs');
  const groupTemplateBlock=builder.slice(builder.indexOf('const groupTemplates=['),builder.indexOf('const questions=[];'));
  assert.equal((groupTemplateBlock.match(/\(t\)=>/g)||[]).length,28,'each group pack gets 28 question drafts');
  const groupSeedBlock=sources.slice(sources.indexOf('const PDI_GROUP_SEEDS=['),sources.indexOf('const MAISON_NATIVE_SEEDS='));
  assert.equal((groupSeedBlock.match(/\{slug:/g)||[]).length,12);
  for(const label of [
    'Quem Conhece Quem?','Histórias de Festa','Confissões Leves','Quem Faria Isso?',
    'Memórias & Nostalgia','Gostos Impopulares','Dilemas Absurdos','Música, Cinema & Séries',
    'Talentos Inúteis','Amigos sem Filtro','O Nosso Grupo em Filme','Desafio do Minuto'
  ]) assert.ok(groupSeedBlock.includes("label:'"+label+"'"),'missing deck theme: '+label);
});

test('group play rotates numbered participants and adds optional party challenges without collecting names or answers',()=>{
  const html=read('para-de-ignorar/jogar.html');
  const start=html.lastIndexOf('<script>');
  const end=html.indexOf('</script>',start);
  assert.ok(start>=0&&end>start);
  const script=html.slice(start+'<script>'.length,end);
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(html,/id="group-size"/);
  assert.match(html,/option value="12">12 pessoas/);
  assert.match(script,/payload\.mode==='group'/);
  assert.match(script,/\(\(absolute-1\)%state\.players\)\+1/);
  assert.match(script,/absolute%4===0/);
  assert.match(script,/pdi_group_round_transition/);
  assert.match(script,/group_size:state\.players/);
  assert.doesNotMatch(script,/playerName|answerText|answer_text|responseText/);
});

test('party mode has 24 varied challenges per locale with session-specific rotation',()=>{
  const html=read('para-de-ignorar/jogar.html');
  const start=html.lastIndexOf('<script>');
  const end=html.indexOf('</script>',start);
  const script=html.slice(start+'<script>'.length,end);
  const startDeck=script.indexOf('const GROUP_CHALLENGES={');
  const endDeck=script.indexOf('document.documentElement.lang=locale',startDeck);
  const deck=script.slice(startDeck,endDeck);
  const locales=[
    [/'pt-PT':\[([\s\S]*?)\n  \],\n  'pt-BR':/.exec(deck),'pt-PT'],
    [/'pt-BR':\[([\s\S]*?)\n  \],\n  en:/.exec(deck),'pt-BR'],
    [/\n  en:\[([\s\S]*?)\n  \],\n  es:/.exec(deck),'en'],
    [/\n  es:\[([\s\S]*?)\n  \]/.exec(deck),'es']
  ];
  for(const [match,locale] of locales){
    assert.ok(match,locale+' challenge deck exists');
    assert.equal((match[1].match(/\{title:/g)||[]).length,24,locale+' challenge count');
  }
  assert.match(script,/function challengeOffsetFor\(value,size\)/);
  assert.match(script,/challengeOffset:challengeOffsetFor\(sessionId,GROUP_CHALLENGES\[locale\]\.length\)/);
  assert.match(script,/state\.challengeOffset\+Math\.floor\(\(absolute-1\)\/4\)/);
});

test('sales page sends the selected mode into checkout while keeping answer privacy visible',()=>{
  const page=read('para-de-ignorar/index.html');
  assert.match(page,/data-mode="duo"/);
  assert.match(page,/data-mode="group"/);
  assert.match(page,/theme.family==='Amigos, Grupos & Festas'/);
  assert.match(page,/t.groupEmpty/);
  assert.match(page,/JSON\.stringify\(\{theme,locale,mode\}\)/);
  assert.match(page,/os novos packs de Amigos & Festas/i);
  assert.match(page,/nunca as tuas respostas/i);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const llms=read('llms.txt');
const discovery=buildPublicDiscovery();
const publicUrls=new Set(discovery.pages.map(page=>page.url));

function section(name){
  const start=llms.indexOf('## '+name);
  assert(start>=0,'missing llms section: '+name);
  const rest=llms.slice(start+3+name.length);
  const next=rest.search(/\n##\s/);
  return next>=0?rest.slice(0,next):rest;
}
function loadBrowserData(rel,key){
  const sandbox={window:{}};
  vm.runInNewContext(read(rel),sandbox,{filename:rel});
  return sandbox.window[key];
}
function euro(value){
  const n=Number(value);
  assert(Number.isFinite(n));
  return Number.isInteger(n)?String(n):n.toFixed(2).replace('.',',');
}

assert(llms.includes('Canonical site: https://maison-jf.com/'));
assert(llms.includes('This file is a concise discovery aid; it does not override'));

const canonicalSection=section('Canonical discovery surfaces');
const canonicalUrls=[...canonicalSection.matchAll(/https:\/\/maison-jf\.com\/[^\s)]+/g)].map(m=>m[0]);
assert(canonicalUrls.length>=10,'expected canonical discovery URLs');
for(const url of canonicalUrls){
  assert(publicUrls.has(url),'llms canonical discovery URL is not in public sitemap: '+url);
}

const utilitySection=section('Utility pages');
for(const url of ['https://maison-jf.com/contacto/','https://maison-jf.com/informacao-legal']){
  assert(utilitySection.includes(url),'missing utility URL: '+url);
  assert(!publicUrls.has(url),'utility URL must not be in public discovery sitemap: '+url);
}
assert(/noindex/i.test(read('contacto/index.html')),'contact utility must remain noindex');
assert(/noindex/i.test(read('informacao-legal.html')),'legal utility must remain noindex');

const products=loadBrowserData('data/products.js','MAISON_PRODUCTS');
assert(Array.isArray(products)&&products.length>0);
for(const product of products){
  const line='- '+product.name+' — '+product.size+' — '+euro(product.price)+' €';
  assert(llms.includes(line),'llms product fact drift: '+line);
}

const books=loadBrowserData('data/ebooks.js','MAISON_EBOOKS').filter(book=>book.status==='published');
assert(books.length>0);
for(const book of books){
  const line='- '+book.title+' — '+euro(book.price)+' €';
  assert(llms.includes(line),'llms ebook fact drift: '+line);
}

const tarotService=read('servicos/tarot/index.html');
assert(tarotService.includes('Consulta de Tarot')&&tarotService.includes('35 €'));
assert(llms.includes('- Consulta de Tarot — 35 €'));

const farol=read('farol.js');
for(const pair of [
  ['Acompanhamento · 170 € · 4 semanas','- Acompanhamento — 170 € · 4 semanas'],
  ['Mentoria · a partir de 125 €','- Mentoria — a partir de 125 €']
]){
  assert(farol.includes(pair[0]),'public Farol fact missing: '+pair[0]);
  assert(llms.includes(pair[1]),'llms service fact drift: '+pair[1]);
}

const ritual=read('espiritualidade/protecao-energetica.html');
assert(/ritual personalizado/i.test(ritual)&&/Sob orçamento/i.test(ritual));
assert(llms.includes('- Ritual Personalizado — sob orçamento'));

const presence=read('portas/companhia.html');
const presenceFacts=[
  ['Presença Online','60 minutos','35 €','- Presença Online — 60 min — 35 €'],
  ['Presença Social','80 € · 2 horas','Hora adicional 40 €','- Presença Social — 2 horas — 80 €; hora adicional 40 €'],
  ['Presença Próxima','80 € · 2 horas','Hora adicional 40 €','- Presença Próxima — 2 horas — 80 €; hora adicional 40 €'],
  ['SOS 1 dia','60 €','Até três atualizações','- SOS 1 dia — 60 €'],
  ['SOS 1 semana','120 €','Uma atualização por dia','- SOS 1 semana — 120 €']
];
for(const [name,a,b,llmsLine] of presenceFacts){
  assert(presence.includes(name)&&presence.includes(a)&&presence.includes(b),'public presence fact missing: '+name);
  assert(llms.includes(llmsLine),'llms presence fact drift: '+name);
}

for(const forbidden of [
  '2 encontros de 60 minutos',
  'até 1 check-in curto por semana',
  'peças de decoração em jesmonite',
  'podem incluir cristais, pulseiras',
  'abertura de caminhos, banho de ervas'
]){
  assert(!llms.includes(forbidden),'non-visible implementation detail leaked into llms: '+forbidden);
}

assert(llms.includes('posters editoriais de universos inéditos'));
assert(llms.includes('não devem ser descritos como livros já publicados'));

console.log(
  'MAISON llms public-fact contract: OK · '+
  products.length+' products · '+books.length+' published ebooks · '+
  canonicalUrls.length+' canonical discovery surfaces'
);

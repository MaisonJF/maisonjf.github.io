import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {translateMaisonHtml} from '../functions/_lib/site-i18n.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['index.html','produtos/index.html','profissionais/index.html','ebooks/index.html','oraculo/index.html','servicos/index.html','teste/index.html','farol/index.html'];
const routes=['/farol/','/produtos/','/servicos/','/oraculo/','/para-de-ignorar/','/teste/','/ebooks/','/profissionais/'];

test('Eight principal pages use identical semantic canonical navigation, desktop and mobile',()=>{
  let header=null;
  for(const page of pages){
    const s=read(page);
    const part=s.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
    assert.ok(part,page+' missing header');
    assert.match(part,/class="site-header maison-global-header"/);
    assert.match(part,/<details class="maison-global-header__menu">/);
    assert.match(part,/<summary aria-label="Abrir navegação principal">Menu<\/summary>/);
    assert.match(part,/<nav class="maison-global-header__nav" id="main-navigation" aria-label="Navegação principal">/);
    for(const route of routes)assert.ok(part.includes('href="'+route+'"'),page+' missing '+route);
    const normalized=part.replace(/\s+/g,' ').trim();
    if(header)assert.equal(normalized,header,page+' drifted from canonical navigation');
    header=normalized;
    assert.match(s,/maison-canonical\.css\?v=20261108/);
  }
  const home=read('index.html');
  assert.match(home,/<footer>[\s\S]*href="\.\/profissionais\/"[\s\S]*<\/footer>/);
});

test('B2B form uses existing telemetry endpoint without leaking personal data',()=>{
  const html=read('profissionais/index.html');
  const script=read('profissionais/b2b-lead-form.js');
  const endpoint=read('functions/api/b2b-lead.js');
  assert.match(html,/<form id="maison-b2b-request">/);
  for(const name of ['nome','empresa','contacto','business','goal','mensagem','consentimento'])
    assert.ok(html.includes('name="'+name+'"'),name);
  assert.match(script,/fetch\('\/api\/b2b-lead'/);
  assert.match(script,/event_type:'b2b\.lead'/);
  assert.match(script,/wa\.me\/351923318289/);
  assert.match(script,/window\.location\.assign\(href\)/);
  assert.ok(!script.includes("metadata:{name"));
  assert.ok(!script.includes("metadata:{email"));
  assert.match(endpoint,/recordB2BEvent/);
  assert.match(html,/maison-ivory\.css/);
});

test('Desktop composition never crops authored homepage/B2B imagery',()=>{
  const home=read('index.html');
  const b2bCss=read('maison-canonical.css');
  assert.match(home,/\.hero__media img\{[^}]*object-fit:contain!important/);
  assert.match(home,/\.collection \.card__image\{[^}]*object-fit:contain!important/);
  assert.match(home,/@media\(min-width:981px\)/);
  assert.match(b2bCss,/\.pro-hero__media img\{[^}]*object-fit:contain!important/);
  assert.match(b2bCss,/\.pro-signature__lighthouse img\{[^}]*object-fit:contain!important/);
});

test('New site links and Barnum/Hormozi copy are localized in pt-PT, pt-BR, EN, ES',()=>{
  const home=read('index.html');
  for(const [locale,terms] of [
    ['pt-PT',['Profissionais / B2B','Jogos','Testes gratuitos','Há dias em que tens tudo.']],
    ['pt-BR',['Profissionais / B2B','Jogos','Testes gratuitos','Há dias em que você tem tudo.']],
    ['en',['Professionals / B2B','Games','Free tests','Some days you have everything.']],
    ['es',['Profesionales / B2B','Juegos','Tests gratuitos','Hay días en los que lo tienes todo.']]
  ]){
    const translated=translateMaisonHtml(home,locale,'/');
    for(const term of terms)assert.ok(translated.includes(term),locale+' missing '+term);
  }
});

test('No commerce routes, original ebook covers or core experiences are deleted',()=>{
  const tree=['functions/api/stripe-webhook-live.js','functions/api/create-product-checkout-live.js','functions/api/ebook-download-live.js','para-de-ignorar/index.html','oraculo/index.html','teste/atencao/index.html','teste/apego/index.html','teste/afeto/index.html','ebooks/index.html'];
  for(const p of tree)assert.ok(fs.existsSync(path.join(root,p)),p);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {translateMaisonHtml} from '../functions/_lib/site-i18n.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');

test('public homepage uses the exact official Farol asset and free-test entry points',()=>{
  assert.match(home,/src="\.\/maison-jf-mark\.svg"/);
  assert.doesNotMatch(home,/<svg[^>]*viewBox="0 0 80 80"/);
  assert.match(read('maison-jf-mark.svg'),/Logótipo MAISON JF® com monograma JF dourado e farol/i);
  for(const route of ['./farol/','./teste/','./teste/atencao/','./teste/apego/','./teste/afeto/'])
    assert.ok(home.includes('href="'+route+'"'),route);
});

test('home has clean public positioning, editorial voice and no legacy labels',()=>{
  for(const str of [
    'NÃO PRECISAS DE MAIS COISAS.','PRECISAS DAS CERTAS.',
    'Uma experiência não se explica.','A atmosfera também é uma escolha.',
    'Uma Maison não precisa de gritar para influenciar.',
    'Começa pela tua peça de assinatura.'
  ])assert.ok(home.includes(str),str);
  for(const str of ['MAISON JF® 3.0','O prazer começa em casa.','O teu corpo merece este prazer.','Uma pergunta pode mudar tudo.','<svg viewBox'])
    assert.ok(!home.includes(str),'unexpected '+str);
});

test('all four locales preserve brand, primary links and publish localized copy',()=>{
  const cases=[
    {locale:'pt-PT',phrase:'Três portas. Sem pagar para começar.',cta:'VER TODOS OS TESTES GRATUITOS'},
    {locale:'pt-BR',phrase:'Nem sempre você sabe o que procura.',cta:'VER TODOS OS TESTES GRATUITOS'},
    {locale:'en',phrase:"You may not know what you're looking for.",cta:'EXPLORE ALL FREE TESTS'},
    {locale:'es',phrase:'No siempre sabes lo que buscas.',cta:'VER TODOS LOS TESTS GRATUITOS'}
  ];
  for(const {locale,phrase,cta} of cases){
    const out=translateMaisonHtml(home,locale,'/');
    assert.ok(out.includes(phrase),locale+' missing translated headline');
    assert.ok(out.includes(cta),locale+' missing translated CTA');
    for(const path of ['maison-jf-mark.svg','teste/atencao/','teste/apego/','teste/afeto/','perf/home/hero-640.webp'])
      assert.ok(out.includes(path),locale+' lost asset or route '+path);
  }
});

test('Ivory couture theme is available and opted-in by commerce and free experiences',()=>{
  const css=read('maison-ivory.css');
  assert.ok(css.includes('#f1eadf'));
  for(const color of ['#94713c','#164b3f','#602437'])assert.ok(css.includes(color));
  for(const page of ['index.html','produtos/index.html','ebooks/index.html','servicos/index.html','oraculo/index.html','farol/index.html','teste/index.html','teste/atencao/index.html','teste/apego/index.html','teste/afeto/index.html']){
    const h=read(page);
    assert.match(h,/class="[^"]*maison-ivory[^"]*"/);
    assert.match(h,/href="\/maison-ivory\.css\?v=20261107"/);
  }
});

test('The protected brand specification documents Farol and Fibonacci without inventing cover assets',()=>{
  const doc=read('docs/MAISON-JF-IDENTIDADE-VISUAL-E-EDITORIAL.md');
  for(const phrase of ['maison-jf-mark.svg','Fibonacci','Marfim','esmeralda','bordeaux'])
    assert.ok(doc.includes(phrase),phrase);
});

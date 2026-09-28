import {
  MAISON_SITE_LOCALES,
  localizedPath,
  localeAlternates,
  splitMaisonLocalePath,
  translateMaisonHtml
} from '../../functions/_lib/site-i18n.js';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

assert(Object.keys(MAISON_SITE_LOCALES).join(',')==='pt-PT,pt-BR,en,es','locale_contract_drift');

assert(localizedPath('/produtos/','pt-PT')==='/produtos/','pt_pt_path_drift');
assert(localizedPath('/produtos/','pt-BR')==='/pt-br/produtos/','pt_br_path_drift');
assert(localizedPath('/produtos/','en')==='/en/produtos/','en_path_drift');
assert(localizedPath('/produtos/','es')==='/es/produtos/','es_path_drift');

assert(splitMaisonLocalePath('/en/servicos/').locale==='en','en_split_drift');
assert(splitMaisonLocalePath('/es/').sourcePath==='/','es_root_split_drift');
assert(splitMaisonLocalePath('/pt-br/oraculo/amor').sourcePath==='/oraculo/amor','pt_br_split_drift');

const alternates=localeAlternates('/produtos/');
assert(alternates.length===5,'hreflang_count_drift');
assert(alternates.some(([lang,url])=>lang==='x-default'&&url==='https://maison-jf.com/produtos/'),'x_default_drift');

const home='<html lang="pt-PT"><head><title>MAISON JF® | PÁRA DE IGNORAR! Volta Para Casa.</title></head><body><h1>O QUE ESTÁS A IGNORAR?</h1><a>Produtos</a></body></html>';
const en=translateMaisonHtml(home,'en','/');
assert(en.includes('STOP IGNORING IT'),'home_en_translation_missing');
assert(en.includes('Products'),'common_en_translation_missing');

const es=translateMaisonHtml(home,'es','/');
assert(es.includes('¿QUÉ ESTÁS IGNORANDO?'),'home_es_translation_missing');
assert(es.includes('Productos'),'common_es_translation_missing');

const br=translateMaisonHtml(home,'pt-BR','/');
assert(br.includes('O QUE VOCÊ ESTÁ IGNORANDO?'),'home_pt_br_translation_missing');

const products='<h1>Há coisas que se sentem<br>antes de se explicarem.</h1><p>Escolhe pelo que queres sentir agora.</p>';
assert(translateMaisonHtml(products,'en','/produtos/').includes('Some things are felt'),'products_en_translation_missing');
assert(translateMaisonHtml(products,'es','/produtos/').includes('Hay cosas que se sienten'),'products_es_translation_missing');

console.log('Maison public-site localization contract: OK');

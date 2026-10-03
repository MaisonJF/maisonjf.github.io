import {
  MAISON_SITE_LOCALES,
  localizedPath,
  localeAlternates,
  splitMaisonLocalePath,
  hasLocalizedSiteCoverage,
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
const homeStory='<section><h2>Isto não apareceu do nada.</h2><a>LER O MANIFESTO</a></section>';
const homeStoryEn=translateMaisonHtml(homeStory,'en','/');
assert(homeStoryEn.includes('This did not come out of nowhere.'),'home_en_story_translation_missing');
assert(homeStoryEn.includes('READ THE MANIFESTO'),'home_en_manifesto_cta_translation_missing');
assert(hasLocalizedSiteCoverage('/manifesto/'),'manifesto_i18n_coverage_missing');
assert(hasLocalizedSiteCoverage('/sobre/'),'about_i18n_coverage_missing');
assert(hasLocalizedSiteCoverage('/contacto/'),'contact_i18n_coverage_missing');
assert(hasLocalizedSiteCoverage('/profissionais/'),'professionals_i18n_coverage_missing');
assert(hasLocalizedSiteCoverage('/produtos/nevoa/'),'product_detail_i18n_coverage_missing');
assert(hasLocalizedSiteCoverage('/sos/'),'sos_i18n_coverage_missing');
const manifesto='<h1>NÃO VOU DIZER-TE QUE VAI FICAR TUDO BEM.</h1><p>Talvez fique. Talvez não.</p>';
assert(translateMaisonHtml(manifesto,'en','/manifesto/').includes("I'M NOT GOING TO TELL YOU EVERYTHING WILL BE FINE."),'manifesto_en_translation_missing');
const about='<h1>Eu sou o João.</h1><p>Não criei isto porque tenha todas as respostas.</p>';
assert(translateMaisonHtml(about,'en','/sobre/').includes("I'm João."),'about_en_translation_missing');
const contact='<h1>Conta-me.</h1><p>Diz-me numa frase o que te trouxe aqui.</p>';
assert(translateMaisonHtml(contact,'en','/contacto/').includes('Tell me in one sentence'),'contact_en_translation_missing');
const product='<h1>Névoa de Ambiente </h1><p>Muda o ar antes de mudares tudo.</p>';
assert(translateMaisonHtml(product,'en','/produtos/nevoa/').includes('Room Mist'),'product_detail_en_translation_missing');

const englishCoverageRoutes=[
  '/envios','/informacao-legal',
  '/trabalho/tenho-medo-de-falar-com-o-meu-chefe',
  '/trabalho/o-conflito-no-trabalho-vem-comigo-para-casa',
  '/trabalho/estou-desempregado-e-sinto-que-a-minha-vida-parou',
  '/trabalho/estou-farto-de-enviar-candidaturas-e-nao-ter-resposta',
  '/profissionais/produtos-para-revenda-em-spa',
  '/profissionais/produtos-para-revenda-em-loja',
  '/profissionais/aromas-para-espacos-de-bem-estar',
  '/profissionais/produtos-de-boas-vindas-para-alojamento-local',
  '/profissionais/velas-aromaticas-para-revenda',
  '/profissionais/como-escolher-produtos-para-um-spa-ou-gabinete',
  '/profissionais/como-escolher-aromas-para-um-gabinete-de-massagem',
  '/profissionais/como-criar-um-ritual-de-boas-vindas-para-clientes',
  '/profissionais/o-que-posso-oferecer-de-diferente-aos-meus-clientes',
  '/espiritualidade/protecao-energetica'
];
for(const route of englishCoverageRoutes)assert(hasLocalizedSiteCoverage(route),'english_route_coverage_missing:'+route);
const neverEnough='<h1>Porque é que<br>nunca chega?</h1><p>Quando estás num dia péssimo, o que te faria sentir mais amado?</p><button>A pessoa largar o telemóvel e ficar realmente comigo.</button>';
const neverEnoughEn=translateMaisonHtml(neverEnough,'en','/teste/nunca-chega/');
assert(neverEnoughEn.includes('Why does it<br>never feel like enough?'),'never_en_title_missing');
assert(neverEnoughEn.includes('When you are having an awful day'),'never_en_question_missing');
assert(neverEnoughEn.includes('put down their phone'),'never_en_choice_missing');
const shipping='<h1>Envios e portes</h1><p>O produto vai. E tu sabes onde ele está.</p>';
assert(translateMaisonHtml(shipping,'en','/envios').includes('Shipping & delivery'),'shipping_en_translation_missing');
const legal='<h1>Informação Legal</h1><p>Quem está por trás da Maison. Sem esconder nada.</p>';
assert(translateMaisonHtml(legal,'en','/informacao-legal').includes('Legal Information'),'legal_en_translation_missing');

const products='<h1>Há coisas que se sentem<br>antes de se explicarem.</h1><p>Escolhe pelo que queres sentir agora.</p>';
assert(translateMaisonHtml(products,'en','/produtos/').includes('Some things are felt'),'products_en_translation_missing');
assert(translateMaisonHtml(products,'es','/produtos/').includes('Hay cosas que se sienten'),'products_es_translation_missing');

console.log('Maison public-site localization contract: OK');

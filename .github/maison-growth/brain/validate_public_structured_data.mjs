import assert from 'node:assert/strict';
import {
  buildOracleStructuredData,
  buildAnswerStructuredData,
  buildTestStructuredData,
  buildEbookStructuredData,
  buildProfessionalStructuredData,
  buildPressStructuredData,
  buildShippingStructuredData,
  buildEditorialStructuredData,
  buildPresentsStructuredData,
  derivedSchemaForPublicPage,
  structuredDataFacts,
  structuredDataScript
} from '../../../functions/_lib/public-structured-data.js';

const oracle=buildOracleStructuredData({
  url:'https://maison-jf.com/oraculo/ansiedade-antecipacao',
  title:'Ansiedade & Antecipação | Oráculo MAISON JF®',
  description:'Uma abertura simbólica do Oráculo MAISON JF® para Ansiedade & Antecipação. Uma leitura simbólica por abertura.'
});
assert(oracle);
const oracleText=JSON.stringify(oracle);
assert(oracleText.includes('"Service"'));
assert(oracleText.includes('"price":"2.00"'));
assert(oracleText.includes('"priceCurrency":"EUR"'));
assert.deepEqual(
  structuredDataFacts(oracle).types,
  ['BreadcrumbList','ListItem','Offer','Service','WebPage']
);

const answer=buildAnswerStructuredData({
  url:'https://maison-jf.com/respostas/o-meu-parceiro-goza-comigo-a-frente-dos-outros',
  title:'O meu parceiro goza comigo à frente dos outros. É só uma brincadeira? | MAISON JF®',
  description:'Quando uma brincadeira do parceiro te envergonha em público, importa perceber respeito, repetição e resposta ao teu limite.'
});
assert(answer);
assert(JSON.stringify(answer).includes('"Article"'));

const test=buildTestStructuredData({
  url:'https://maison-jf.com/teste/apego/',
  title:'Qual é o teu estilo de apego? | MAISON JF®',
  description:'Teste de autoconhecimento MAISON JF® para reconhecer padrões de proximidade, distância, segurança e medo nos vínculos.'
});
assert(test);
assert(structuredDataFacts(test).types.includes('WebPage'));
assert(!JSON.stringify(test).includes('"Quiz"'));

const ebook=buildEbookStructuredData({
  url:'https://maison-jf.com/ebooks/virgulas-do-destino-o-turista/',
  title:'Vírgulas do Destino: O Turista | MAISON JF®',
  description:'O primeiro livro da saga Vírgulas do Destino.',
  priceText:'2,99 €'
});
assert(ebook);
const ebookText=JSON.stringify(ebook);
assert(ebookText.includes('"Book"'));
assert(ebookText.includes('"bookFormat":"https://schema.org/EBook"'));
assert(ebookText.includes('"price":"2.99"'));

const b2bService=buildProfessionalStructuredData({
  url:'https://maison-jf.com/profissionais/produtos-para-revenda-em-spa',
  title:'Produtos para revenda em spa ou gabinete | MAISON JF®',
  description:'Uma pequena selecção de produtos pode prolongar a experiência para casa.'
});
assert(b2bService);
assert(JSON.stringify(b2bService).includes('"Service"'));

const b2bArticle=buildProfessionalStructuredData({
  url:'https://maison-jf.com/profissionais/como-escolher-produtos-para-um-spa-ou-gabinete',
  title:'Como escolher produtos para um spa ou gabinete | MAISON JF®',
  description:'Antes de escolher referências, pergunta onde a experiência termina cedo demais.'
});
assert(b2bArticle);
assert(JSON.stringify(b2bArticle).includes('"Article"'));

assert(buildPressStructuredData({
  url:'https://maison-jf.com/press/',
  title:'Press & Media | MAISON JF®',
  description:'Informação para imprensa, entrevistas e media sobre João Fadario e a MAISON JF®.'
}));
assert(buildShippingStructuredData({
  url:'https://maison-jf.com/envios',
  title:'Envios e Portes | MAISON JF®',
  description:'Condições de envio, portes por zona, tracking e patamares de portes grátis da MAISON JF®.'
}));
assert(buildEditorialStructuredData({
  url:'https://maison-jf.com/trabalho/tenho-medo-de-falar-com-o-meu-chefe',
  title:'Tenho medo de falar com o meu chefe. | MAISON JF®',
  description:'Uma resposta MAISON JF® sobre chefia, autoridade ou avaliação profissional.'
}));
assert(buildPresentsStructuredData({
  url:'https://maison-jf.com/presentes/',
  title:'Presentes com intenção | MAISON JF®',
  description:'Presentes MAISON JF® para pausa, casa, agradecimento e pequenos gestos.'
}));

for(const schema of [oracle,answer,test,ebook,b2bService,b2bArticle]){
  const text=JSON.stringify(schema);
  for(const forbidden of ['"datePublished"','"dateModified"','"author"','"ratingValue"','"AggregateRating"','"review"']){
    assert(!text.includes(forbidden),forbidden+' must not be invented');
  }
}

assert.equal(derivedSchemaForPublicPage({
  url:'https://maison-jf.com/oraculo/leitura',
  title:'A tua leitura | Oráculo MAISON JF®',
  description:'Privado',
  robots:'noindex,nofollow'
}),null);
assert.equal(derivedSchemaForPublicPage({
  url:'https://maison-jf.com/oraculo/amor',
  title:'Amor | Oráculo MAISON JF®',
  description:'Descrição',
  robots:'index,follow',
  staticJsonLdBlocks:1
}),null);
assert.equal(derivedSchemaForPublicPage({
  url:'https://maison-jf.com/profissionais/teste/',
  title:'Diagnóstico | MAISON JF®',
  description:'Privado',
  robots:'index,follow'
}),null);

const escaped=structuredDataScript({'@context':'https://schema.org','name':'</script><x>'});
assert(!escaped.includes('</script><x>'));
assert(escaped.includes('\\u003c/script>'));

console.log('MAISON public structured data contract: OK');

/*
MAISON PRODUCT CATALOGUE
CURRENT contains only products actually sold now. FUTURE is planning data and must never render as available stock until status changes deliberately.
To add a current product, add one object to MAISON_PRODUCTS. Required: slug, name, category, price, currency, description, cta.
Optional: size, priceNote, media, ritual, usage, ingredients, nominal, pao, production, safety, related, status. Stable public route convention: /produtos/<slug>/.
Media roles supported by the Maison system: hero, packshot, detail, texture, ritual, use, ambience, pairing, story.
Keep commercial facts here. Layout and behaviour belong in produtos/detail.js.
*/
window.MAISON_PRODUCTS=[
{
 slug:'vela-vidro',name:'Vela Aromática',size:'170 g',category:'Casa',price:14,currency:'EUR',
 description:'Luz e aroma para mudar o ritmo de um espaço.',
 production:'Produção artesanal em Portugal, com cera vegetal de soja e coco.',
 safety:'Não deixes a vela acesa sem vigilância e mantém-na afastada de materiais inflamáveis. Consulta o rótulo antes de utilizar.',
 media:[],cta:'Quero levar para casa'
},
{
 slug:'vela-pequena',name:'Vela Aromática',size:'70 g',category:'Casa',price:8,currency:'EUR',
 description:'Luz e aroma num formato mais pequeno.',
 production:'Produção artesanal em Portugal.',
 safety:'Não deixes a vela acesa sem vigilância e mantém-na afastada de materiais inflamáveis. Consulta o rótulo antes de utilizar.',
 media:[],cta:'Quero levar para casa'
},
{
 slug:'oleo-massagem',name:'Óleo de Massagem',size:'60 ml',category:'Corpo',price:12,currency:'EUR',
 priceNote:'12–12,50 € consoante a referência',
 description:'Toque e pausa num ritual simples de massagem.',
 usage:'Aplica uma pequena quantidade sobre a pele e massaja até absorção. Reaplica conforme necessário.',
 ingredients:'Simmondsia Chinensis Seed Oil, Tocopherol, Parfum, Cinnamaldehyde, Citronellol, Geraniol, Hydroxycitronellal, Helional, Alpha-Damascone, Beta-Damascone, Limonene, Linalool, Benzyl Benzoate, Citral, Eugenol, Benzyl Alcohol, Allyl Cyclohexyl Propionate.',
 nominal:'60 ml',pao:'12M',production:'Óleo corporal perfumado artesanal para massagem, produzido em Portugal.',
 media:[{role:'hero',src:'../images/root/oleo-massagem.webp',alt:'Óleo de massagem MAISON JF em ambiente editorial',aspect:'portrait'}],cta:'Quero saber mais'
},
{
 slug:'nevoa',name:'Névoa de Ambiente',size:'20 ml',category:'Casa',price:6.5,currency:'EUR',
 description:'Uma forma rápida de mudar o ambiente através do aroma.',
 usage:'Pulveriza no espaço quando queres marcar uma mudança imediata de atmosfera.',
 production:'Produção artesanal em Portugal. A referência disponível é confirmada antes do pagamento.',
 media:[],cta:'Quero escolher'
},
{
 slug:'escalda-pes',name:'Escalda-Pés',size:'150 g',category:'Corpo',price:5,currency:'EUR',
 description:'Um gesto simples para parar, aquecer e criar um momento para os pés.',
 usage:'Dissolve 1 a 2 colheres de sopa em água morna e mergulha os pés durante 10 a 20 minutos. É um produto de enxaguamento e de uso externo.',
 ingredients:'Sodium Chloride, Sodium Lauryl Sulfoacetate, Parfum, Cinnamaldehyde, Citronellol, Geraniol, Hydroxycitronellal, Helional, Alpha-Damascone, Beta-Damascone, Limonene, Linalool, Benzyl Benzoate, Citral, Eugenol, Benzyl Alcohol, Allyl Cyclohexyl Propionate.',
 nominal:'150 g',pao:'12M',production:'Produção artesanal em Portugal.',
 media:[{role:'hero',src:'../images/root/corpo-escalda-pes.webp',alt:'Escalda-pés MAISON JF num momento de cuidado corporal',aspect:'portrait'}],cta:'Quero criar este momento'
}
];
window.MAISON_PRODUCT_FUTURE=[
{slug:null,name:'Água Perfumada',workingName:true,status:'future',note:'Nome comercial por definir'},
{slug:'sais-de-banho',name:'Sais de Banho',status:'future'}
];
window.MAISON_PRODUCT_BY_SLUG=Object.fromEntries(window.MAISON_PRODUCTS.map(product=>[product.slug,product]));

/*
MAISON PRODUCT CATALOGUE
Public commercial catalogue only.
Add any number of editorial images to media; the product page will build the visual rhythm automatically.
Supported media roles: hero, packshot, detail, texture, ritual, use, ambience, pairing, story.
Label/regulatory detail belongs on the product label and internal product documentation unless it is genuinely needed before purchase.
*/
window.MAISON_PRODUCTS=[
{
 slug:'vela-vidro',name:'Vela Aromática',size:'170 g',category:'Casa',price:14,currency:'EUR',
 description:'Luz e aroma para mudar o ritmo de um espaço.',
 media:[],
 ritual:{title:'Acende para mudar de ritmo.',text:'A luz baixa. O aroma fica. E a casa percebe que o dia mudou de lugar.'},
 cta:'Quero levar para casa'
},
{
 slug:'vela-pequena',name:'Vela Aromática',size:'70 g',category:'Casa',price:8,currency:'EUR',
 description:'Luz e aroma num formato mais pequeno.',
 media:[],
 ritual:{title:'Um gesto pequeno também conta.',text:'Um ponto de luz pode chegar para marcar alguns minutos que não precisam de servir para mais nada.'},
 cta:'Quero levar para casa'
},
{
 slug:'oleo-massagem',name:'Óleo de Massagem',size:'60 ml',category:'Corpo',price:12.5,currency:'EUR',
 description:'Toque e pausa num ritual simples de massagem.',
 media:[{role:'hero',src:'../images/cinematic/ritual.avif',alt:'Atmosfera editorial MAISON JF de toque e pausa',aspect:'portrait',editorial:true}],
 ritual:{title:'O corpo percebe o toque antes da explicação.',text:'Alguns minutos de massagem podem ser uma forma simples de devolver presença ao corpo.'},
 cta:'Quero saber mais'
},
{
 slug:'nevoa',name:'Névoa de Ambiente',size:'20 ml',category:'Casa',price:6.5,currency:'EUR',
 description:'Uma forma rápida de mudar o ambiente através do aroma.',
 media:[],
 ritual:{title:'Muda o ar antes de mudares tudo.',text:'Um gesto no espaço pode bastar para marcar a passagem entre o que veio de fora e o tempo que agora é teu.'},
 cta:'Quero escolher'
},
{
 slug:'escalda-pes',name:'Escalda-Pés',size:'150 g',category:'Corpo',price:5,currency:'EUR',
 description:'Um gesto simples para parar, aquecer e criar um momento para os pés.',
 media:[{role:'hero',src:'../images/root/corpo-escalda-pes.webp?v=20260919-fix1',alt:'Escalda-Pés MAISON JF numa pausa de cuidado corporal',aspect:'portrait',editorial:true}],
 ritual:{title:'Não compliques a pausa.',text:'Água morna, aroma e alguns minutos em que ninguém te pede nada.'},
 cta:'Quero criar este momento'
}
];
window.MAISON_PRODUCT_FUTURE=[
{slug:null,name:'Água Perfumada',workingName:true,status:'future',note:'Nome comercial por definir'},
{slug:'sais-de-banho',name:'Sais de Banho',status:'future'}
];
window.MAISON_PRODUCT_BY_SLUG=Object.fromEntries(window.MAISON_PRODUCTS.map(product=>[product.slug,product]));

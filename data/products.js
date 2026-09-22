/*
MAISON PRODUCT CATALOGUE
Public commercial catalogue only.
Add real product photography to productImage and any editorial/secondary media to media.
Supported media roles: hero, packshot, detail, texture, ritual, use, ambience, pairing, story.
*/
window.MAISON_PRODUCTS=[
{
 slug:'vela-vidro',sku:'MJ-VELA-170',name:'Vela Aromática',size:'170 g',category:'Casa',price:14,currency:'EUR',availability:'in_stock',condition:'new',productImage:null,
 description:'Luz e aroma para mudar o ritmo de um espaço.',
 media:[],
 ritual:{title:'Acende para mudar de ritmo.',text:'A luz baixa. O aroma fica. E a casa percebe que o dia mudou de lugar.'},
 cta:'Quero levar para casa'
},
{
 slug:'vela-pequena',sku:'MJ-VELA-070',name:'Vela Aromática',size:'70 g',category:'Casa',price:8,currency:'EUR',availability:'in_stock',condition:'new',productImage:null,
 description:'Luz e aroma num formato mais pequeno.',
 media:[],
 ritual:{title:'Um gesto pequeno também conta.',text:'Um ponto de luz pode chegar para marcar alguns minutos que não precisam de servir para mais nada.'},
 cta:'Quero levar para casa'
},
{
 slug:'oleo-massagem',sku:'MJ-OLEO-060',name:'Óleo de Massagem',size:'60 ml',category:'Corpo',price:12,currency:'EUR',availability:'in_stock',condition:'new',productImage:null,
 description:'Toque e pausa num ritual simples de massagem.',
 media:[{role:'hero',src:'../images/cinematic/ritual.avif',alt:'Atmosfera editorial MAISON JF de toque e pausa',aspect:'portrait',editorial:true}],
 ritual:{title:'O corpo percebe o toque antes da explicação.',text:'Alguns minutos de massagem podem ser uma forma simples de devolver presença ao corpo.'},
 cta:'Quero saber mais'
},
{
 slug:'nevoa',sku:'MJ-NEVOA-020',name:'Névoa de Ambiente',size:'20 ml',category:'Casa',price:7,currency:'EUR',availability:'in_stock',condition:'new',productImage:null,
 description:'Uma forma rápida de mudar o ambiente através do aroma.',
 media:[],
 ritual:{title:'Muda o ar antes de mudares tudo.',text:'Um gesto no espaço pode bastar para marcar a passagem entre o que veio de fora e o tempo que agora é teu.'},
 cta:'Quero escolher'
},
{
 slug:'escalda-pes',sku:'MJ-ESCALDA-150',name:'Escalda-Pés',size:'150 g',category:'Corpo',price:5,currency:'EUR',availability:'in_stock',condition:'new',productImage:null,
 description:'Um gesto simples para parar, aquecer e criar um momento para os pés.',
 media:[],
 ritual:{title:'Não compliques a pausa.',text:'Água morna, aroma e alguns minutos em que ninguém te pede nada.'},
 cta:'Quero criar este momento'
}
];
window.MAISON_PRODUCT_FUTURE=[
{slug:null,name:'Água Perfumada',workingName:true,status:'future',note:'Nome comercial por definir'},
{slug:'sais-de-banho',name:'Sais de Banho',status:'future'}
];
window.MAISON_PRODUCT_BY_SLUG=Object.fromEntries(window.MAISON_PRODUCTS.map(product=>[product.slug,product]));

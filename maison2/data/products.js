/*
MAISON PRODUCT CATALOGUE
To add a future product, add one object to MAISON_PRODUCTS. Required: slug, name, category, price, currency, description, cta.
Optional: size, priceNote, media, ritual, related, status. Stable public route convention: /maison2/produtos/<slug>/.
Media roles supported by the Maison system: hero, packshot, detail, texture, ritual, use, ambience, pairing, story.
Keep commercial facts here. Layout and behaviour belong in produtos/detail.js.
*/
window.MAISON_PRODUCTS=[
{slug:'escalda-pes',name:'Escalda-Pés',size:'150 g',category:'Corpo',price:5,currency:'EUR',description:'Um gesto simples para parar, aquecer e criar um momento para os pés.',media:[],cta:'Quero criar este momento'},
{slug:'vela-vidro',name:'Vela Aromática',size:'Tamanho maior',category:'Casa',price:14,currency:'EUR',description:'Luz e aroma para mudar o ritmo de um espaço.',media:[],cta:'Quero levar para casa'},
{slug:'vela-pequena',name:'Vela Aromática',size:'Tamanho pequeno',category:'Casa',price:8,currency:'EUR',description:'A mesma ideia de luz e aroma num formato mais pequeno.',media:[],cta:'Quero levar para casa'},
{slug:'oleo-massagem',name:'Óleo de Massagem',category:'Corpo',price:12,currency:'EUR',priceNote:'12–12,50 € consoante a referência',description:'Toque e pausa num ritual simples de massagem.',media:[{role:'hero',src:'../../images/root/oleo-massagem.webp',alt:'Óleo de massagem MAISON JF em ambiente editorial',aspect:'portrait'}],cta:'Quero saber mais'},
{slug:'nevoa',name:'Névoa',category:'Casa',price:6.5,currency:'EUR',description:'Uma forma rápida de mudar o ambiente através do aroma.',media:[],cta:'Quero escolher'}
];
window.MAISON_PRODUCT_BY_SLUG=Object.fromEntries(window.MAISON_PRODUCTS.map(product=>[product.slug,product]));
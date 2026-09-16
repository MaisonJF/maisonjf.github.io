/* MAISON EBOOK CATALOGUE
   Catalogue-driven architecture: add a book here, not in the layout.
   The library has no fixed visual slot limit.
   Each title may grow from a cover to a complete editorial essay through media[].
   Supported roles: cover, hero, portrait, detail, atmosphere, story, excerpt.
*/
window.MAISON_EBOOKS=[
  {
    slug:'virgulas-do-destino-o-turista',
    checkoutId:'turista',
    title:'Vírgulas do Destino: O Turista',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    description:'O primeiro livro da saga Vírgulas do Destino. Desejo, destino, mistério e um encontro que continua a fazer perguntas depois da última página.',
    price:2.99,currency:'EUR',cover:'/images/ebooks/o-turista.webp',media:[{role:'cover',src:'/images/ebooks/o-turista.webp',alt:'Capa do ebook Vírgulas do Destino: O Turista',aspect:'book',caption:'Vírgulas do Destino · O Turista'}],purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-meandros-da-vida',
    checkoutId:'meandros',
    title:'Vírgulas do Destino: Meandros da Vida',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    description:'Tarot, perda, desejo e recomeço. Caim viaja para Portugal depois de uma tragédia pessoal e encontra mais do que estava à procura.',
    price:4.99,currency:'EUR',cover:'/images/ebooks/meandros-da-vida.webp',media:[{role:'cover',src:'/images/ebooks/meandros-da-vida.webp',alt:'Capa do ebook Vírgulas do Destino: Meandros da Vida',aspect:'book',caption:'Vírgulas do Destino · Meandros da Vida'}],purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-a-vinganca',
    title:'Vírgulas do Destino: A Vingança!',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'coming-soon',
    price:null,currency:'EUR',cover:null,media:[],purchaseUrl:null,featured:false
  },
  {
    slug:'virgulas-do-destino-prisioneiros-do-amor',
    title:'Vírgulas do Destino: Prisioneiros do Amor',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'coming-soon',
    price:null,currency:'EUR',cover:null,media:[],purchaseUrl:null,featured:false
  }
];
window.MAISON_PUBLISHED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published');
window.MAISON_ANNOUNCED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published'||book.status==='coming-soon');
window.MAISON_EBOOK_BY_SLUG=Object.fromEntries(window.MAISON_EBOOKS.map(book=>[book.slug,book]));

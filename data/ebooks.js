/* MAISON EBOOK CATALOGUE
   Catalogue-driven architecture: add a book here, not in the layout.
   Published titles render publicly; announced titles may render as coming soon;
   internal planned titles stay hidden. The library has no fixed visual slot limit. */
window.MAISON_EBOOKS=[
  {
    slug:'virgulas-do-destino-o-turista',
    checkoutId:'turista',
    title:'Vírgulas do Destino: O Turista',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    description:'O primeiro livro da saga Vírgulas do Destino. Desejo, destino, mistério e um encontro que continua a fazer perguntas depois da última página.',
    price:2.99,currency:'EUR',cover:null,purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-meandros-da-vida',
    checkoutId:'meandros',
    title:'Vírgulas do Destino: Meandros da Vida',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    description:'Tarot, perda, desejo e recomeço. Caim viaja para Portugal depois de uma tragédia pessoal e encontra mais do que estava à procura.',
    price:4.99,currency:'EUR',cover:null,purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-a-vinganca',
    title:'Vírgulas do Destino: A Vingança!',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'coming-soon',
    price:null,currency:'EUR',cover:null,purchaseUrl:null,featured:false
  },
  {
    slug:'virgulas-do-destino-prisioneiros-do-amor',
    title:'Vírgulas do Destino: Prisioneiros do Amor',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'coming-soon',
    price:null,currency:'EUR',cover:null,purchaseUrl:null,featured:false
  }
];
window.MAISON_PUBLISHED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published');
window.MAISON_ANNOUNCED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published'||book.status==='coming-soon');
window.MAISON_EBOOK_BY_SLUG=Object.fromEntries(window.MAISON_EBOOKS.map(book=>[book.slug,book]));

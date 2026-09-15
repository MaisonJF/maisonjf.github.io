/* MAISON EBOOK CATALOGUE
   Prepared for hundreds of titles. Published titles render publicly.
   Announced titles may render as coming soon. Internal planned titles stay hidden. */
window.MAISON_EBOOKS=[
  {
    slug:'virgulas-do-destino-o-turista',
    title:'Vírgulas do Destino: O Turista',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    price:null,currency:'EUR',cover:null,purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-meandros-da-vida',
    title:'Vírgulas do Destino: Meandros da Vida',
    collection:'Vírgulas do Destino',
    language:'pt-PT',format:'ebook',status:'published',
    price:null,currency:'EUR',cover:null,purchaseUrl:null,featured:true
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

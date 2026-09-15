/* MAISON EBOOK CATALOGUE
   Architecture prepared for hundreds of titles.
   Only entries with status:'published' render publicly.
   Add future/planned works freely without exposing them on the site or sitemap. */
window.MAISON_EBOOKS=[
  /* Example schema, keep commented until a real title is ready:
  {
    slug:'titulo-do-ebook',
    title:'Título do Ebook',
    subtitle:'Subtítulo opcional',
    author:'João Ferreira',
    collection:'Colecção opcional',
    volume:null,
    language:'pt-PT',
    format:'ebook',
    status:'published',
    price:4.99,
    currency:'EUR',
    cover:'../images/ebooks/titulo-do-ebook.webp',
    description:'Descrição editorial curta.',
    themes:['tema'],
    purchaseUrl:'',
    featured:false,
    publishedAt:'2026-09-15'
  }
  */
];
window.MAISON_PUBLISHED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published');
window.MAISON_EBOOK_BY_SLUG=Object.fromEntries(window.MAISON_EBOOKS.map(book=>[book.slug,book]));

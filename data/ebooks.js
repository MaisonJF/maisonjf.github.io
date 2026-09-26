window.MAISON_EBOOKS=[
  {
    slug:'para-de-ignorar',
    checkoutId:'para-de-ignorar',
    title:'Pára de Ignorar!',
    collection:'Éditions Maison JF',
    language:'pt-PT',format:'ebook',formats:['pdf','epub'],status:'published',
    description:'Um livro para parar de passar por cima do que já sabes que está a pedir atenção. Para ler, escrever, voltar atrás e finalmente olhar.',
    price:5.99,currency:'EUR',cover:'/images/ebooks/para-de-ignorar-final.webp',media:[{role:'cover',src:'/images/ebooks/para-de-ignorar-final.webp',alt:'Capa do ebook Pára de Ignorar!, de João Fadario',aspect:'book',caption:'Pára de Ignorar! · João Fadario'}],purchaseUrl:null,featured:true
  },
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
  }
];
window.MAISON_PUBLISHED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published');
window.MAISON_EBOOK_BY_SLUG=Object.fromEntries(window.MAISON_EBOOKS.map(book=>[book.slug,book]));

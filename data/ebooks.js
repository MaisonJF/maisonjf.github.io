window.MAISON_EBOOKS=[
  {
    slug:'para-de-ignorar',
    checkoutId:'para-de-ignorar',
    title:'Pára de Ignorar!',
    collection:'Sem Filtros · Éditions Maison JF',
    language:'pt-PT',format:'ebook',formats:['pdf','epub'],status:'published',
    description:'Um livro para parar de passar por cima do que já sabes que está a pedir atenção. Para reconhecer o que tens ignorado e finalmente olhar.',
    price:5.99,currency:'EUR',cover:'/images/ebooks/para-de-ignorar-final.webp',media:[{role:'cover',src:'/images/ebooks/para-de-ignorar-final.webp',alt:'Capa do ebook Pára de Ignorar!, de João Fadario',aspect:'book',caption:'Pára de Ignorar! · João Fadario'}],purchaseUrl:null,featured:true
  },
  {
    slug:'raio-azul',
    checkoutId:'raio-azul',
    title:'Raio Azul',
    collection:'Espiritualidade · Colecção Os Sete Raios · Éditions Maison JF',
    language:'pt-PT',format:'ebook',formats:['pdf','epub'],status:'published',
    description:'Vontade, protecção e direcção sem fazer guerra à própria vida. O primeiro volume da Colecção Os Sete Raios aproxima tradição espiritual, reflexão e prática com linguagem humana.',
    price:3.50,currency:'EUR',cover:'/images/ebooks/raio-azul.webp?v=20260929-final',media:[{role:'cover',src:'/images/ebooks/raio-azul.webp?v=20260929-final',alt:'Capa do ebook Raio Azul, de João Fadario',aspect:'book',caption:'Colecção Os Sete Raios · Raio Azul'}],purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-o-turista',
    checkoutId:'turista',
    title:'Vírgulas do Destino: O Turista',
    collection:'Éditions Maison JF',
    language:'pt-PT',format:'ebook',status:'published',
    description:'O primeiro livro da saga Vírgulas do Destino. Desejo, destino, mistério e um encontro que continua a fazer perguntas depois da última página.',
    price:2.99,currency:'EUR',cover:'/images/ebooks/o-turista.webp',media:[{role:'cover',src:'/images/ebooks/o-turista.webp',alt:'Capa do ebook Vírgulas do Destino: O Turista',aspect:'book',caption:'Vírgulas do Destino · O Turista'}],purchaseUrl:null,featured:true
  },
  {
    slug:'virgulas-do-destino-meandros-da-vida',
    checkoutId:'meandros',
    title:'Vírgulas do Destino: Meandros da Vida',
    collection:'Éditions Maison JF',
    language:'pt-PT',format:'ebook',status:'published',
    description:'Tarot, perda, desejo e recomeço. Caim viaja para Portugal depois de uma tragédia pessoal e encontra mais do que estava à procura.',
    price:4.99,currency:'EUR',cover:'/images/ebooks/meandros-da-vida.webp',media:[{role:'cover',src:'/images/ebooks/meandros-da-vida.webp',alt:'Capa do ebook Vírgulas do Destino: Meandros da Vida',aspect:'book',caption:'Vírgulas do Destino · Meandros da Vida'}],purchaseUrl:null,featured:true
  }
];
window.MAISON_PUBLISHED_EBOOKS=window.MAISON_EBOOKS.filter(book=>book.status==='published');
window.MAISON_EBOOK_BY_SLUG=Object.fromEntries(window.MAISON_EBOOKS.map(book=>[book.slug,book]));

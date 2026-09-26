export const EBOOKS = {
  para-de-ignorar: {
    slug: 'para-de-ignorar',
    title: 'PÁRA DE IGNORAR!',
    priceId: 'price_1UJtIN5H3wYRPmPVvIrLnAhO',
    unitCents: 599,
    files: {
      epub: { key: 'ebooks/para-de-ignorar.epub', filename: 'PARA-DE-IGNORAR-Joao-Fadario.epub', contentType: 'application/epub+zip' },
      pdf: { key: 'ebooks/para-de-ignorar.pdf', filename: 'PARA-DE-IGNORAR-Joao-Fadario.pdf', contentType: 'application/pdf' }
    }
  },
  turista: {
    slug: 'virgulas-do-destino-o-turista',
    title: 'Vírgulas do Destino: O Turista',
    priceId: 'price_1UEoZP5H3wYRPmPVLTG7nmwl',
    unitCents: 299,
    key: 'ebooks/virgulas-do-destino-o-turista.pdf',
    filename: 'Virgulas-do-Destino-O-Turista.pdf'
  },
  meandros: {
    slug: 'virgulas-do-destino-meandros-da-vida',
    title: 'Vírgulas do Destino: Meandros da Vida',
    priceId: 'price_1UEoWC5H3wYRPmPVFiVh4xT8',
    unitCents: 499,
    key: 'ebooks/virgulas-do-destino-meandros-da-vida.pdf',
    filename: 'Virgulas-do-Destino-Meandros-da-Vida.pdf'
  }
};

export const EBOOK_IDS = Object.keys(EBOOKS);
export const isEbookId = id => Object.prototype.hasOwnProperty.call(EBOOKS, id);

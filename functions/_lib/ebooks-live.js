export const EBOOKS = {
  turista: {
    slug: 'virgulas-do-destino-o-turista',
    title: 'Vírgulas do Destino: O Turista',
    priceId: 'price_1UEoZP5H3wYRPmPVLTG7nmwl',
    unitCents: 299,
    key: 'ebooks/virgulas-do-destino-o-turista.pdf',
    filename: 'Virgulas-do-Destino-O-Turista.pdf'
  },
  'para-de-ignorar': {
    slug: 'para-de-ignorar',
    title: 'Pára de Ignorar!',
    priceId: 'price_1UJtIN5H3wYRPmPVvIrLnAhO',
    unitCents: 599,
    formats: {
      pdf: { key: 'ebooks/para-de-ignorar/para-de-ignorar.pdf', filename: 'Para-de-Ignorar.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/para-de-ignorar/para-de-ignorar.epub', filename: 'Para-de-Ignorar.epub', contentType: 'application/epub+zip' }
    }
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

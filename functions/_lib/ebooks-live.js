export const EBOOKS = {
  turista: {
    slug: 'virgulas-do-destino-o-turista',
    title: 'Vírgulas do Destino: O Turista',
    priceId: 'price_1UEoZP5H3wYRPmPVLTG7nmwl',
    unitCents: 299,
    formats: {
      pdf: { key: 'ebooks/o-turista/O_Turista_Ebook_Final_Maison_JF.pdf', filename: 'O-Turista.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/o-turista/O_Turista_Ebook_Final_Maison_JF.epub', filename: 'O-Turista.epub', contentType: 'application/epub+zip' }
    }
  },
  'para-de-ignorar': {
    slug: 'para-de-ignorar',
    title: 'Pára de Ignorar!',
    priceId: 'price_1UJtIN5H3wYRPmPVvIrLnAhO',
    unitCents: 599,
    formats: {
      pdf: { key: 'ebooks/para-de-ignorar/PARA_DE_IGNORAR_Maison_JF_FINAL.pdf', filename: 'Para-de-Ignorar.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/para-de-ignorar/PARA_DE_IGNORAR_Maison_JF_FINAL.epub', filename: 'Para-de-Ignorar.epub', contentType: 'application/epub+zip' }
    }
  },
  'raio-azul': {
    slug: 'raio-azul',
    title: 'Raio Azul',
    priceId: 'price_1UKzoT5H3wYRPmPVu5txzx35',
    unitCents: 350,
    formats: {
      pdf: { key: 'ebooks/raio-azul/RAIO_AZUL_Ebook_Completo.pdf', filename: 'Raio-Azul.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/raio-azul/RAIO_AZUL_Ebook_Completo.epub', filename: 'Raio-Azul.epub', contentType: 'application/epub+zip' }
    }
  },
  meandros: {
    slug: 'virgulas-do-destino-meandros-da-vida',
    title: 'Vírgulas do Destino: Meandros da Vida',
    priceId: 'price_1UEoWC5H3wYRPmPVFiVh4xT8',
    unitCents: 499,
    formats: {
      pdf: { key: 'ebooks/meandros-da-vida/Meandros_da_Vida_Ebook_Final_Maison_JF.pdf', filename: 'Meandros-da-Vida.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/meandros-da-vida/Meandros_da_Vida_Ebook_Final_Maison_JF.epub', filename: 'Meandros-da-Vida.epub', contentType: 'application/epub+zip' }
    }
  }
};

export const EBOOK_IDS = Object.keys(EBOOKS);
export const isEbookId = id => Object.prototype.hasOwnProperty.call(EBOOKS, id);

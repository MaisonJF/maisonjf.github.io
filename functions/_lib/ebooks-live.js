export const EBOOKS = {
  turista: {
    slug: 'virgulas-do-destino-o-turista',
    title: 'Vírgulas do Destino: O Turista',
    priceId: 'price_1UEoZP5H3wYRPmPVLTG7nmwl',
    unitCents: 299,
    brlCents: 1290,
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
    brlCents: 2190,
    // Keep older paid/in-flight sessions valid after the price change; used only for verification, never new checkout creation.
    legacyBrlCents: [2490],
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
    brlCents: 1490,
    formats: {
      pdf: { key: 'ebooks/raio-azul/RAIO_AZUL_Ebook_Completo.pdf', filename: 'Raio-Azul.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/raio-azul/RAIO_AZUL_Ebook_Completo.epub', filename: 'Raio-Azul.epub', contentType: 'application/epub+zip' }
    }
  },
  meandros: {
    slug: 'virgulas-do-destino-meandros-da-vida',
    title: 'Vírgulas do Destino: Meandros da Vida',
    priceId: 'price_1ULKLx5H3wYRPmPVWaNfTQWB',
    unitCents: 350,
    brlCents: 1490,
    formats: {
      pdf: { key: 'ebooks/meandros-da-vida/Meandros_da_Vida_Ebook_Final_Maison_JF.pdf', filename: 'Meandros-da-Vida.pdf', contentType: 'application/pdf' },
      epub: { key: 'ebooks/meandros-da-vida/Meandros_da_Vida_Ebook_Final_Maison_JF.epub', filename: 'Meandros-da-Vida.epub', contentType: 'application/epub+zip' }
    }
  }
};

export const EBOOK_IDS = Object.keys(EBOOKS);
export const isEbookId = id => Object.prototype.hasOwnProperty.call(EBOOKS, id);

/**
 * Returns the amount that should be used to validate a Stripe ebook session.
 * New sessions record their server-calculated expected total in metadata.
 * Older sessions (created before that field existed) may match a known
 * historical Brazilian catalog total, so repricing never invalidates a valid
 * purchase that is still inside its access window.
 */
export function expectedEbookSessionAmount(session, ebookIds, locale) {
  if (!Array.isArray(ebookIds) || !ebookIds.length || !ebookIds.every(isEbookId)) return null;

  const isBrazil = locale === 'pt-BR';
  const currentTotal = ebookIds.reduce((total, id) => {
    const item = EBOOKS[id];
    return total + (isBrazil ? item.brlCents : item.unitCents);
  }, 0);
  const allowedTotals = [currentTotal];

  if (isBrazil) {
    const historicalTotal = ebookIds.reduce((total, id) => {
      const item = EBOOKS[id];
      const history = Array.isArray(item.legacyBrlCents) ? item.legacyBrlCents : [];
      return total + (history[0] ?? item.brlCents);
    }, 0);
    if (!allowedTotals.includes(historicalTotal)) allowedTotals.push(historicalTotal);
  }

  const metadataValue = session?.metadata?.expected_amount_total;
  if (metadataValue !== undefined && metadataValue !== null && metadataValue !== '') {
    const recordedTotal = Number(metadataValue);
    return Number.isInteger(recordedTotal) &&
      allowedTotals.includes(recordedTotal) &&
      session?.amount_total === recordedTotal
      ? recordedTotal
      : null;
  }

  return allowedTotals.includes(session?.amount_total) ? session.amount_total : null;
}

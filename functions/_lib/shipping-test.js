// MAISON JF® | motor de portes do laboratório
// Os pesos reais por SKU ainda não estão preenchidos. No sandbox, o peso é simulado
// para testar a lógica completa sem inventar pesos de transporte.
const TABLES = {
  mainland: [
    [1000, 590],
    [2000, 650],
    [5000, 750],
    [10000, 890]
  ],
  islands: [
    [1000, 1190],
    [2000, 1990],
    [5000, 1990],
    [10000, 3090]
  ],
  eu: [
    [500, 1790],
    [1000, 1990],
    [2000, 2390],
    [5000, 3490],
    [10000, 5490]
  ],
  world: [
    [500, 2490],
    [1000, 3090],
    [2000, 4290],
    [5000, 6990],
    [10000, 11990]
  ]
};

export const EU_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','RO','SK','SI','ES','SE'
];

export const WORLD_COUNTRIES = [
  'AL','AD','AO','AR','AM','AU','AZ','BA','BR','CA','CL','CN','CO','CR',
  'EG','GE','HK','IS','IL','IN','ID','JP','JO','KZ','KR','LI','MA','MX',
  'MD','MC','ME','NZ','MK','NO','PE','PH','QA','RS','SG','ZA','CH','TW',
  'TH','TN','TR','UA','AE','GB','US','UY','VN'
];

export function classifyPortugalPostalCode(postalCode) {
  const match = String(postalCode || '').trim().match(/^(\d{4})(?:-\d{3})?$/);
  if (!match) return null;
  const prefix = Number(match[1]);
  if (prefix >= 9000 && prefix <= 9999) return 'islands';
  if (prefix >= 1000 && prefix <= 8999) return 'mainland';
  return null;
}

function bandAmount(zone, weightG) {
  const table = TABLES[zone];
  if (!table) return null;
  for (const [maxWeight, cents] of table) {
    if (weightG <= maxWeight) return cents;
  }
  return null;
}

function ceilEuro(cents) {
  return Math.ceil(cents / 100) * 100;
}

function freeThreshold(zone, shippingCents) {
  if (zone === 'mainland') return 4900;
  if (zone === 'islands') return Math.max(7900, ceilEuro(shippingCents * 4));
  if (zone === 'eu') return Math.max(9900, ceilEuro(shippingCents * 4));
  if (zone === 'world') return Math.max(14900, ceilEuro(shippingCents * 4));
  return null;
}

export function calculateShipping({ region, postalCode, weightG, subtotalCents, containsBruma = false }) {
  const grams = Number(weightG);
  const subtotal = Number(subtotalCents);

  if (!Number.isFinite(grams) || grams < 1 || grams > 10000) {
    return { ok: false, error: 'No laboratório, usa um peso embalado simulado entre 1 g e 10 kg.' };
  }
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    return { ok: false, error: 'Subtotal inválido.' };
  }

  let zone;
  let allowedCountries;

  if (region === 'pt') {
    zone = classifyPortugalPostalCode(postalCode);
    if (!zone) {
      return { ok: false, error: 'Indica um código postal português válido no formato 0000-000.' };
    }
    allowedCountries = ['PT'];
  } else if (region === 'eu') {
    zone = 'eu';
    allowedCountries = EU_COUNTRIES;
  } else if (region === 'world') {
    zone = 'world';
    allowedCountries = WORLD_COUNTRIES;
  } else {
    return { ok: false, error: 'Escolhe o destino da encomenda.' };
  }

  if (containsBruma && zone !== 'mainland' && zone !== 'islands') {
    return {
      ok: false,
      error: 'A Bruma de Ambiente ainda não está activada para checkout internacional enquanto confirmamos uma solução de transporte compatível com o produto.'
    };
  }

  const baseShipping = bandAmount(zone, grams);
  if (baseShipping == null) {
    return { ok: false, error: 'Encomendas acima de 10 kg ficam sujeitas a orçamento de transporte.' };
  }

  const threshold = freeThreshold(zone, baseShipping);
  const shippingCents = subtotal >= threshold ? 0 : baseShipping;

  const zoneLabels = {
    mainland: 'Portugal Continental',
    islands: 'Açores e Madeira',
    eu: 'União Europeia',
    world: 'Resto do mundo'
  };

  return {
    ok: true,
    zone,
    zoneLabel: zoneLabels[zone],
    weightG: grams,
    subtotalCents: subtotal,
    shippingCents,
    baseShippingCents: baseShipping,
    freeThresholdCents: threshold,
    freeShipping: shippingCents === 0,
    allowedCountries
  };
}

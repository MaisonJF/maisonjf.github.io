// MAISON JF® | motor de portes do laboratório
// Os pesos reais por SKU ainda não estão preenchidos. No sandbox, o peso é simulado
// para testar a lógica completa sem inventar pesos de transporte.

const TABLES = {
  mainland: [[1000,590],[2000,650],[5000,750],[10000,890]],
  islands: [[1000,1190],[2000,1990],[5000,1990],[10000,3090]],
  eu_near: [[500,1290],[1000,1390],[2000,1590],[5000,2290],[10000,3490]],
  eu_west: [[500,1590],[1000,1790],[2000,2190],[5000,2990],[10000,4490]],
  eu_far: [[500,1790],[1000,1990],[2000,2390],[5000,3490],[10000,5490]],
  world_near: [[500,1990],[1000,2390],[2000,2990],[5000,4490],[10000,6990]],
  world_mid: [[500,2490],[1000,3090],[2000,4290],[5000,6990],[10000,11990]],
  world_far: [[500,2990],[1000,3690],[2000,4990],[5000,7990],[10000,13990]]
};

export const EU_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','RO','SK','SI','ES','SE'
];

export const WORLD_COUNTRIES = [
  'AD','AL','AM','AO','AR','AU','AZ','BA','BR','CA','CH','CL','CN','CO','CR',
  'EC','EG','GE','GB','HK','ID','IL','IN','IS','JP','JO','KZ','KR','LI','MA',
  'MC','MD','ME','MX','MK','MY','NO','NZ','PA','PE','PH','QA','RS','SG','TH',
  'TN','TR','TW','UA','AE','US','UY','VN','ZA'
];

const EU_NEAR = new Set(['ES']);
const EU_WEST = new Set(['FR','BE','NL','LU','DE','IT','IE','AT']);
const WORLD_NEAR = new Set(['AD','AL','BA','CH','GB','IS','LI','MC','MD','ME','MK','NO','RS','TR','UA']);
const WORLD_MID = new Set(['CA','EG','IL','JO','MA','MX','QA','TN','AE','US','ZA']);

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
  if (zone.startsWith('eu_')) return Math.max(9900, ceilEuro(shippingCents * 4));
  if (zone.startsWith('world_')) return Math.max(14900, ceilEuro(shippingCents * 4));
  return null;
}

function internationalZone(region, countryCode) {
  const code = String(countryCode || '').toUpperCase();
  if (region === 'eu') {
    if (!EU_COUNTRIES.includes(code)) return null;
    if (EU_NEAR.has(code)) return 'eu_near';
    if (EU_WEST.has(code)) return 'eu_west';
    return 'eu_far';
  }
  if (region === 'world') {
    if (!WORLD_COUNTRIES.includes(code)) return null;
    if (WORLD_NEAR.has(code)) return 'world_near';
    if (WORLD_MID.has(code)) return 'world_mid';
    return 'world_far';
  }
  return null;
}

export function calculateShipping({
  region,
  countryCode,
  postalCode,
  weightG,
  subtotalCents,
  containsBruma = false
}) {
  const grams = Number(weightG);
  const subtotal = Number(subtotalCents);

  if (!Number.isFinite(grams) || grams < 1 || grams > 10000) {
    return { ok: false, error: 'No laboratório, usa um peso embalado simulado entre 1 g e 10 kg.' };
  }
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    return { ok: false, error: 'Subtotal inválido.' };
  }

  let zone;
  let zoneLabel;
  let allowedCountries;

  if (region === 'pt') {
    zone = classifyPortugalPostalCode(postalCode);
    if (!zone) {
      return { ok: false, error: 'Indica um código postal português válido no formato 0000-000.' };
    }
    zoneLabel = zone === 'mainland' ? 'Portugal Continental' : 'Açores e Madeira';
    allowedCountries = ['PT'];
  } else if (region === 'eu' || region === 'world') {
    zone = internationalZone(region, countryCode);
    if (!zone) {
      return { ok: false, error: 'Escolhe um país de destino disponível.' };
    }
    zoneLabel = region === 'eu' ? 'União Europeia' : 'Resto do mundo';
    allowedCountries = [String(countryCode).toUpperCase()];
  } else {
    return { ok: false, error: 'Escolhe o destino da encomenda.' };
  }

  if (containsBruma && region !== 'pt') {
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

  return {
    ok: true,
    zone,
    zoneLabel,
    countryCode: region === 'pt' ? 'PT' : String(countryCode).toUpperCase(),
    weightG: grams,
    subtotalCents: subtotal,
    shippingCents,
    baseShippingCents: baseShipping,
    freeThresholdCents: threshold,
    freeShipping: shippingCents === 0,
    allowedCountries
  };
}

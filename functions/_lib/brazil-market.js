/**
 * Brazil-market controls for localized digital pricing.
 *
 * Cloudflare's request.cf.country is server-provided geolocation metadata; do
 * not replace it with browser fields or client-controlled headers.
 */
export function brazilMarketAccessResponse(request, locale) {
  if (locale !== 'pt-BR') return null;
  const country = String(request?.cf?.country || '').trim().toUpperCase();
  if (country === 'BR') return null;

  return json({
    error: 'Os preços em reais destinam-se a compras realizadas a partir do Brasil. Desativa a VPN/proxy, se estiveres a usar um, ou utiliza o preço internacional.'
  }, 403);
}

export function hasBrazilBillingAddress(session) {
  return String(session?.customer_details?.address?.country || '')
    .trim()
    .toUpperCase() === 'BR';
}

export function hasEligibleBrazilSession(session, expectedAmount) {
  return session?.currency === 'brl' &&
    session?.amount_total === expectedAmount &&
    hasBrazilBillingAddress(session);
}

export function brazilSessionEligibilityResponse(session, locale, expectedAmount) {
  if (locale !== 'pt-BR') return null;
  if (hasEligibleBrazilSession(session, expectedAmount)) return null;

  return json({
    error: 'Não foi possível validar esta compra como elegível para o preço brasileiro. É necessária uma morada de faturação no Brasil e o valor em reais esperado. Se acreditas que existe um erro, contacta a MAISON JF® antes de tentares pagar novamente.'
  }, 403);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

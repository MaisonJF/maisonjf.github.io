(() => {
  const PRODUCTS = {
    bruma: { name: 'Brumas de Ambiente MAISON JF®', price: 650, kind: 'physical', max: 10 },
    oleo: { name: 'Óleo de Massagem MAISON JF®', price: 1200, kind: 'physical', max: 10 },
    escalda: { name: 'Escalda-Pés MAISON JF® · 280 g', price: 950, kind: 'physical', max: 10 },
    vela: { name: 'Vela Aromática MAISON JF® · 170 g', price: 1400, kind: 'physical', max: 10 },
    turista: { name: 'Ebook · Vírgulas do Destino: O Turista', price: 299, kind: 'digital', max: 1 },
    meandros: { name: 'Ebook · Vírgulas do Destino: Meandros da Vida', price: 499, kind: 'digital', max: 1 }
  };

  const KEY = 'maisonCartTest';
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const grandTotalEl = document.getElementById('grand-total');
  const statusEl = document.getElementById('cart-status');
  const checkoutButton = document.getElementById('checkout-button');
  const shippingPanel = document.getElementById('shipping-panel');
  const shippingRegion = document.getElementById('shipping-region');
  const shippingPostalWrap = document.getElementById('shipping-postal-wrap');
  const shippingPostal = document.getElementById('shipping-postal');
  const shippingWeight = document.getElementById('shipping-weight');
  const shippingQuoteEl = document.getElementById('shipping-quote');
  const shippingSummary = document.getElementById('shipping-summary');
  const shippingTotalEl = document.getElementById('shipping-total');

  let subtotalCents = 0;
  let shippingCents = 0;
  let shippingReady = true;
  let quoteSerial = 0;

  const normaliseCart = value => {
    const cart = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return cart;
    for (const [id, rawQty] of Object.entries(value)) {
      if (!PRODUCTS[id]) continue;
      const qty = Number(rawQty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      cart[id] = Math.min(PRODUCTS[id].max, qty);
    }
    return cart;
  };

  const read = () => {
    try { return normaliseCart(JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch { return {}; }
  };

  const write = cart => localStorage.setItem(KEY, JSON.stringify(normaliseCart(cart)));
  const money = cents => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const itemsFromCart = cart => Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
  const hasPhysical = cart => Object.keys(cart).some(id => PRODUCTS[id]?.kind === 'physical');

  function shippingPayload() {
    return {
      region: shippingRegion.value,
      postalCode: shippingPostal.value.trim(),
      testWeightG: Number(shippingWeight.value)
    };
  }

  function updateTotals() {
    totalEl.textContent = money(subtotalCents);
    grandTotalEl.textContent = money(subtotalCents + shippingCents);
    if (shippingSummary.hidden) return;
    shippingTotalEl.textContent = shippingReady ? money(shippingCents) : '—';
  }

  function updateCheckoutState(cart) {
    const entries = Object.entries(cart);
    if (!entries.length) {
      checkoutButton.disabled = true;
      return;
    }
    checkoutButton.disabled = hasPhysical(cart) ? !shippingReady : false;
  }

  async function refreshShippingQuote() {
    const cart = read();

    if (!hasPhysical(cart)) {
      shippingPanel.hidden = true;
      shippingSummary.hidden = true;
      shippingCents = 0;
      shippingReady = true;
      updateTotals();
      updateCheckoutState(cart);
      return;
    }

    shippingPanel.hidden = false;
    shippingSummary.hidden = false;
    shippingPostalWrap.hidden = shippingRegion.value !== 'pt';

    if (!shippingRegion.value) {
      shippingReady = false;
      shippingCents = 0;
      shippingQuoteEl.textContent = 'Escolhe o destino para calcular.';
      updateTotals();
      updateCheckoutState(cart);
      return;
    }

    if (shippingRegion.value === 'pt' && !shippingPostal.value.trim()) {
      shippingReady = false;
      shippingCents = 0;
      shippingQuoteEl.textContent = 'Indica o código postal para distinguir Continente de ilhas.';
      updateTotals();
      updateCheckoutState(cart);
      return;
    }

    const serial = ++quoteSerial;
    shippingReady = false;
    shippingQuoteEl.textContent = 'A calcular portes…';
    updateCheckoutState(cart);

    try {
      const response = await fetch('/api/shipping-quote-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          items: itemsFromCart(cart),
          shipping: shippingPayload()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (serial !== quoteSerial) return;
      if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível calcular os portes.');

      shippingReady = true;
      shippingCents = Number(data.shippingCents) || 0;
      const threshold = Number(data.freeThresholdCents) || 0;

      if (data.freeShipping) {
        shippingQuoteEl.textContent = `${data.zoneLabel}: portes grátis nesta encomenda. Patamar aplicado: ${money(threshold)}.`;
      } else {
        shippingQuoteEl.textContent = `${data.zoneLabel}: ${money(shippingCents)} de portes rastreáveis. Portes grátis a partir de ${money(threshold)} neste cenário.`;
      }
    } catch (error) {
      if (serial !== quoteSerial) return;
      shippingReady = false;
      shippingCents = 0;
      shippingQuoteEl.textContent = error.message || 'Não foi possível calcular os portes.';
    }

    updateTotals();
    updateCheckoutState(cart);
  }

  function render() {
    const cart = read();
    const entries = Object.entries(cart);
    itemsEl.innerHTML = '';
    subtotalCents = 0;

    if (!entries.length) {
      itemsEl.innerHTML = '<p>O carrinho está vazio.</p>';
    } else {
      for (const [id, qty] of entries) {
        subtotalCents += PRODUCTS[id].price * qty;
        const row = document.createElement('div');
        row.className = 'checkout-cart__item';
        const plus = qty < PRODUCTS[id].max
          ? `<button type="button" data-inc="${id}" aria-label="Adicionar uma unidade">+</button>`
          : '';
        row.innerHTML = `<div><strong>${PRODUCTS[id].name}</strong><p>${money(PRODUCTS[id].price)} cada</p></div>
          <div class="checkout-cart__controls">
            <button type="button" data-dec="${id}" aria-label="Retirar uma unidade">−</button>
            <span>${qty}</span>
            ${plus}
          </div>`;
        itemsEl.appendChild(row);
      }
    }

    shippingCents = 0;
    shippingReady = !hasPhysical(cart);
    updateTotals();
    updateCheckoutState(cart);
    refreshShippingQuote();
  }

  function change(id, delta) {
    if (!PRODUCTS[id]) return;
    const cart = read();
    const next = Math.max(0, Math.min(PRODUCTS[id].max, (cart[id] || 0) + delta));
    if (next === 0) delete cart[id];
    else cart[id] = next;
    write(cart);
    render();
  }

  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = add.dataset.add;
      if (!PRODUCTS[id]) return;
      const qtyInput = document.getElementById(`qty-${id}`);
      const parsed = Number(qtyInput?.value || 1);
      const qty = Number.isInteger(parsed) ? Math.max(1, Math.min(PRODUCTS[id].max, parsed)) : 1;
      change(id, qty);
      statusEl.textContent = 'Adicionado ao carrinho.';
      return;
    }

    const inc = e.target.closest('[data-inc]');
    if (inc) return change(inc.dataset.inc, 1);

    const dec = e.target.closest('[data-dec]');
    if (dec) return change(dec.dataset.dec, -1);
  });

  shippingRegion.addEventListener('change', () => {
    shippingPostalWrap.hidden = shippingRegion.value !== 'pt';
    refreshShippingQuote();
  });
  shippingPostal.addEventListener('input', refreshShippingQuote);
  shippingWeight.addEventListener('change', refreshShippingQuote);

  document.getElementById('clear-cart').addEventListener('click', () => {
    localStorage.removeItem(KEY);
    statusEl.textContent = 'Carrinho limpo.';
    render();
  });

  checkoutButton.addEventListener('click', async () => {
    const cart = read();
    const items = itemsFromCart(cart);
    if (!items.length) return;
    if (hasPhysical(cart) && !shippingReady) {
      statusEl.textContent = 'Confirma primeiro o destino e os portes.';
      return;
    }

    checkoutButton.disabled = true;
    checkoutButton.textContent = 'A abrir checkout…';
    statusEl.textContent = '';

    try {
      const response = await fetch('/api/create-checkout-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          items,
          shipping: hasPhysical(cart) ? shippingPayload() : null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível abrir o checkout.');
      window.location.href = data.url;
    } catch (error) {
      statusEl.textContent = error.message || 'Não foi possível abrir o checkout.';
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Finalizar no Stripe';
    }
  });

  const query = new URLSearchParams(window.location.search);
  if (query.get('cancelado') === '1') {
    statusEl.textContent = 'Checkout cancelado. O carrinho ficou guardado.';
    history.replaceState({}, '', window.location.pathname);
  }

  render();
})();

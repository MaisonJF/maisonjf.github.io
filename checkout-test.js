(() => {
  const PRODUCTS = {
    bruma: { name: 'Brumas de Ambiente MAISON JF®', price: 650 },
    oleo: { name: 'Óleo de Massagem MAISON JF®', price: 1200 },
    escalda: { name: 'Escalda-Pés MAISON JF® · 280 g', price: 950 },
    vela: { name: 'Vela Aromática MAISON JF® · 170 g', price: 1400 }
  };
  const KEY = 'maisonCartTest';
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const statusEl = document.getElementById('cart-status');
  const checkoutButton = document.getElementById('checkout-button');

  const normaliseCart = value => {
    const cart = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return cart;
    for (const [id, rawQty] of Object.entries(value)) {
      if (!PRODUCTS[id]) continue;
      const qty = Number(rawQty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      cart[id] = Math.min(10, qty);
    }
    return cart;
  };

  const read = () => {
    try { return normaliseCart(JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch { return {}; }
  };
  const write = cart => localStorage.setItem(KEY, JSON.stringify(normaliseCart(cart)));
  const money = cents => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  function render() {
    const cart = read();
    const entries = Object.entries(cart);
    itemsEl.innerHTML = '';
    let total = 0;

    if (!entries.length) {
      itemsEl.innerHTML = '<p>O carrinho está vazio.</p>';
      checkoutButton.disabled = true;
    } else {
      for (const [id, qty] of entries) {
        total += PRODUCTS[id].price * qty;
        const row = document.createElement('div');
        row.className = 'checkout-cart__item';
        row.innerHTML = `<div><strong>${PRODUCTS[id].name}</strong><p>${money(PRODUCTS[id].price)} cada</p></div>
          <div class="checkout-cart__controls">
            <button type="button" data-dec="${id}" aria-label="Retirar uma unidade">−</button>
            <span>${qty}</span>
            <button type="button" data-inc="${id}" aria-label="Adicionar uma unidade">+</button>
          </div>`;
        itemsEl.appendChild(row);
      }
      checkoutButton.disabled = false;
    }
    totalEl.textContent = money(total);
  }

  function change(id, delta) {
    if (!PRODUCTS[id]) return;
    const cart = read();
    const next = Math.max(0, Math.min(10, (cart[id] || 0) + delta));
    if (next === 0) delete cart[id]; else cart[id] = next;
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
      const qty = Number.isInteger(parsed) ? Math.max(1, Math.min(10, parsed)) : 1;
      change(id, qty);
      statusEl.textContent = 'Adicionado ao carrinho.';
      return;
    }
    const inc = e.target.closest('[data-inc]');
    if (inc) return change(inc.dataset.inc, 1);
    const dec = e.target.closest('[data-dec]');
    if (dec) return change(dec.dataset.dec, -1);
  });

  document.getElementById('clear-cart').addEventListener('click', () => {
    localStorage.removeItem(KEY);
    statusEl.textContent = 'Carrinho limpo.';
    render();
  });

  checkoutButton.addEventListener('click', async () => {
    const cart = read();
    const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return;

    checkoutButton.disabled = true;
    checkoutButton.textContent = 'A abrir checkout…';
    statusEl.textContent = '';

    try {
      const response = await fetch('/api/create-checkout-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items })
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
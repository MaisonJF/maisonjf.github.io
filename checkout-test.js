(() => {
  const PRODUCTS = {
    bruma: { name: 'Brumas de Ambiente MAISON JF®', price: 650 },
    oleo: { name: 'Óleo de Massagem MAISON JF®', price: 1200 }
  };
  const KEY = 'maisonCartTest';
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const statusEl = document.getElementById('cart-status');
  const checkoutButton = document.getElementById('checkout-button');

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  };
  const write = cart => localStorage.setItem(KEY, JSON.stringify(cart));
  const money = cents => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  function render() {
    const cart = read();
    const entries = Object.entries(cart).filter(([id, qty]) => PRODUCTS[id] && qty > 0);
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
      const qtyInput = document.getElementById(`qty-${id}`);
      const qty = Math.max(1, Math.min(10, Number(qtyInput?.value || 1)));
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
    const items = Object.entries(cart)
      .filter(([id, qty]) => PRODUCTS[id] && qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return;

    checkoutButton.disabled = true;
    checkoutButton.textContent = 'A abrir checkout…';
    statusEl.textContent = '';

    try {
      const response = await fetch('/api/create-checkout-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível abrir o checkout.');
      window.location.href = data.url;
    } catch (error) {
      statusEl.textContent = error.message || 'Não foi possível abrir o checkout.';
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Finalizar no Stripe';
    }
  });

  render();
})();
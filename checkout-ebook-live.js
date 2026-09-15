(() => {
  const status = document.getElementById('edition-checkout-status');
  const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;

  function buttons() { return [...document.querySelectorAll('[data-buy-ebook]')]; }
  function setBusy(activeButton, busy) {
    buttons().forEach(button => {
      button.disabled = busy;
      if (!button.dataset.label) button.dataset.label = button.textContent;
      if (button === activeButton) button.textContent = busy ? 'A abrir pagamento…' : button.dataset.label;
    });
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-buy-ebook]');
    if (!button) return;
    const id = String(button.dataset.buyEbook || '');
    if (!idPattern.test(id)) return;
    setBusy(button, true);
    if (status) status.textContent = '';
    try {
      const response = await fetch('/api/create-checkout-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items: [{ id, quantity: 1 }] })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível abrir o pagamento.');
      location.href = data.url;
    } catch (error) {
      if (status) status.textContent = error.message || 'Não foi possível abrir o pagamento.';
      setBusy(button, false);
    }
  });

  const query = new URLSearchParams(location.search);
  if (query.get('checkout_cancelado') === '1') {
    if (status) status.textContent = 'Pagamento cancelado. Não foi cobrado qualquer valor.';
    history.replaceState({}, '', location.pathname);
  }
})();
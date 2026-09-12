(() => {
  const status = document.getElementById('edition-checkout-status');
  const buttons = [...document.querySelectorAll('[data-buy-ebook]')];

  function setBusy(activeButton, busy) {
    buttons.forEach(button => {
      button.disabled = busy;
      if (button === activeButton) {
        button.textContent = busy ? 'A abrir pagamento…' : button.dataset.label;
      }
    });
  }

  buttons.forEach(button => {
    button.dataset.label = button.textContent;
    button.addEventListener('click', async () => {
      const id = button.dataset.buyEbook;
      if (id !== 'turista' && id !== 'meandros') return;

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
  });

  const query = new URLSearchParams(location.search);
  if (query.get('checkout_cancelado') === '1') {
    if (status) status.textContent = 'Pagamento cancelado. Não foi cobrado qualquer valor.';
    history.replaceState({}, '', location.pathname);
  }
})();

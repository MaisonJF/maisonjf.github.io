/* MAISON JF® | acesso permanente à informação legal */
(function () {
  'use strict';

  document.querySelectorAll('.footer').forEach(footer => {
    if (footer.querySelector('a[href="informacao-legal.html"]')) return;

    const columns = Array.from(footer.querySelectorAll('.footer__column'));
    const contact = columns.find(column => {
      const title = column.querySelector('.footer__column-title');
      return title && title.textContent.trim() === 'Contacto';
    }) || columns[columns.length - 1];

    if (!contact) return;
    const list = contact.querySelector('.footer__links');
    if (!list) return;

    const legalItem = document.createElement('li');
    legalItem.innerHTML = '<a href="informacao-legal.html" class="footer__link">Informação legal</a>';
    list.appendChild(legalItem);

    if (!footer.querySelector('a[href*="livroreclamacoes.pt"]')) {
      const complaintsItem = document.createElement('li');
      complaintsItem.innerHTML = '<a href="https://www.livroreclamacoes.pt/Inicio/" class="footer__link" target="_blank" rel="noopener">Livro de Reclamações</a>';
      list.appendChild(complaintsItem);
    }
  });
})();
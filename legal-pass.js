/* MAISON JF® | acesso permanente à informação legal e ao canal */
(function () {
  'use strict';

  const CHANNEL_URL = 'canal/';
  const SHARE_URL = 'https://wa.me/?text=' + encodeURIComponent('Segue a MAISON JF® no WhatsApp 🔦 https://maison-jf.com/canal/');

  document.querySelectorAll('.footer').forEach(footer => {
    const columns = Array.from(footer.querySelectorAll('.footer__column'));
    const contact = columns.find(column => {
      const title = column.querySelector('.footer__column-title');
      return title && title.textContent.trim() === 'Contacto';
    }) || columns[columns.length - 1];

    if (!contact) return;
    const list = contact.querySelector('.footer__links');
    if (!list) return;

    if (!footer.querySelector('a[href="informacao-legal.html"]')) {
      const legalItem = document.createElement('li');
      legalItem.innerHTML = '<a href="informacao-legal.html" class="footer__link">Informação legal</a>';
      list.appendChild(legalItem);
    }

    if (!footer.querySelector('a[href*="livroreclamacoes.pt"]')) {
      const complaintsItem = document.createElement('li');
      complaintsItem.innerHTML = '<a href="https://www.livroreclamacoes.pt/Inicio/" class="footer__link" target="_blank" rel="noopener">Livro de Reclamações</a>';
      list.appendChild(complaintsItem);
    }

    if (!footer.querySelector('a[href="canal/"]')) {
      const channelItem = document.createElement('li');
      channelItem.innerHTML = '<a href="' + CHANNEL_URL + '" class="footer__link">Canal WhatsApp</a>';
      list.appendChild(channelItem);
    }

    if (!footer.querySelector('a[data-share-channel="1"]')) {
      const shareItem = document.createElement('li');
      const share = document.createElement('a');
      share.href = SHARE_URL;
      share.className = 'footer__link';
      share.target = '_blank';
      share.rel = 'noopener noreferrer';
      share.dataset.shareChannel = '1';
      share.textContent = 'Partilhar o canal';
      shareItem.appendChild(share);
      list.appendChild(shareItem);
    }
  });
})();
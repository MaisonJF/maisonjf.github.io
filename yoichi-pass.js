/* MAISON JF® | carregador dos passes editorial, legal e comercial */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* Correção robusta das imagens da homepage: aplica estilos inline e injeta as regras
     necessárias sem depender da cascata/cache do CSS editorial. */
  if (page === 'index.html') {
    const v = '20260914-1025';
    const hero = document.querySelector('.hero__bg-image');
    if (hero) {
      hero.style.setProperty('background', `linear-gradient(180deg, rgba(8,8,8,.10) 0%, rgba(8,8,8,.06) 42%, rgba(8,8,8,.68) 100%), url('/images/root/hero-maison.webp?v=${v}') center 45% / cover no-repeat`, 'important');
    }

    const corpo = document.querySelector('.transformacao-card__visual--ambre');
    if (corpo) {
      corpo.style.setProperty('background-image', `linear-gradient(180deg, rgba(8,7,6,.03), rgba(8,7,6,.25)), url('/images/root/corpo-escalda-pes.webp?v=${v}')`, 'important');
      corpo.style.setProperty('background-size', 'cover', 'important');
      corpo.style.setProperty('background-position', 'center 54%', 'important');
    }

    const casa = document.querySelector('.transformacao-card__visual--esmeralda');
    if (casa) {
      casa.style.setProperty('background-image', `linear-gradient(180deg, rgba(8,7,6,.03), rgba(8,7,6,.24)), url('/images/root/casa-ambiente.webp?v=${v}')`, 'important');
      casa.style.setProperty('background-size', 'cover', 'important');
      casa.style.setProperty('background-position', 'center 56%', 'important');
    }

    const companhia = document.querySelector('.transformacao-card__visual--bordeaux');
    if (companhia) {
      companhia.style.setProperty('background-image', `linear-gradient(180deg, rgba(8,7,6,.03), rgba(8,7,6,.22)), url('/images/root/companhia-cafe.webp?v=${v}')`, 'important');
      companhia.style.setProperty('background-size', 'cover', 'important');
      companhia.style.setProperty('background-position', 'center 52%', 'important');
    }

    if (!document.getElementById('maison-home-images-fix')) {
      const style = document.createElement('style');
      style.id = 'maison-home-images-fix';
      style.textContent = `
        #explorar .catalogue-card:has(a[href="produto-oleo-massagem.html"]) { flex-direction: column; padding: 0 !important; }
        #explorar .catalogue-card:has(a[href="produto-oleo-massagem.html"])::before {
          content: ''; display: block; flex: 0 0 auto; width: 100%; aspect-ratio: 4 / 5;
          background: linear-gradient(180deg, rgba(8,7,6,.02), rgba(8,7,6,.20)), url('/images/root/oleo-massagem.webp?v=${v}') center 54% / cover no-repeat !important;
          border-bottom: 1px solid var(--borda-subtil);
        }
      `;
      document.head.appendChild(style);
    }
  }

  function loadScript(src, marker) {
    return new Promise(resolve => {
      if (document.querySelector(`script[src^="${marker}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  loadScript('yoichi-pass-core.js?v=20260914-1025', 'yoichi-pass-core.js')
    .then(() => loadScript('legal-pass.js?v=20260911-envios', 'legal-pass.js'))
    .then(() => loadScript('commerce-pass.js?v=20260912-products', 'commerce-pass.js'));
})();

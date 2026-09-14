/* MAISON JF® | carregador dos passes editorial, legal e comercial */
(function () {
  'use strict';

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

  function ensureOracleEntry() {
    const onHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
    if (!onHome) return;

    const desktopList = document.querySelector('.header__nav-list');
    if (desktopList && !desktopList.querySelector('a[href="/oraculo/"]')) {
      const item = document.createElement('li');
      item.innerHTML = '<a href="/oraculo/" class="header__nav-link">Oráculo</a>';
      desktopList.insertBefore(item, desktopList.lastElementChild);
    }

    const mobileMenu = document.querySelector('#mobileMenu');
    if (mobileMenu && !mobileMenu.querySelector('a[href="/oraculo/"]')) {
      const link = document.createElement('a');
      link.href = '/oraculo/';
      link.className = 'mobile-menu__link';
      link.textContent = 'Oráculo';
      const about = mobileMenu.querySelector('a[href="#joao"]');
      mobileMenu.insertBefore(link, about || null);
    }
  }

  loadScript('yoichi-pass-core.js?v=20260914-clean-images', 'yoichi-pass-core.js')
    .then(() => {
      ensureOracleEntry();
      return loadScript('legal-pass.js?v=20260911-envios', 'legal-pass.js');
    })
    .then(() => loadScript('commerce-pass.js?v=20260912-products', 'commerce-pass.js'));
})();

/* MAISON JF® | carregador do passe editorial e legal */
(function () {
  'use strict';

  function loadLegalPass() {
    if (document.querySelector('script[src^="legal-pass.js"]')) return;
    const legal = document.createElement('script');
    legal.src = 'legal-pass.js?v=20260910';
    document.body.appendChild(legal);
  }

  if (document.querySelector('script[src^="yoichi-pass-core.js"]')) {
    loadLegalPass();
    return;
  }

  const core = document.createElement('script');
  core.src = 'yoichi-pass-core.js?v=20260910-final';
  core.onload = loadLegalPass;
  core.onerror = loadLegalPass;
  document.body.appendChild(core);
})();
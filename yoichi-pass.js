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

  loadScript('yoichi-pass-core.js?v=20260910-final', 'yoichi-pass-core.js')
    .then(() => loadScript('legal-pass.js?v=20260910-2', 'legal-pass.js'))
    .then(() => loadScript('commerce-pass.js?v=20260910', 'commerce-pass.js'));
})();
/* MAISON JF® | páginas individuais de produto e caminho comercial */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const products = {
    'brumas': { href: 'produto-bruma-ambiente.html', label: 'Ver Bruma' },
    'escalda-pes': { href: 'produto-escalda-pes.html', label: 'Ver Escalda-Pés' },
    'oleo': { href: 'produto-oleo-massagem.html', label: 'Ver Óleo de Massagem' },
    'aguas-lencois': { href: 'produto-aguas-lencois.html', label: 'Ver Águas de Lençóis' }
  };

  function connectProductCards() {
    Object.entries(products).forEach(([id, data]) => {
      const card = document.getElementById(id);
      if (!card) return;
      const action = card.querySelector('a.btn');
      if (!action) return;
      action.href = data.href;
      action.textContent = data.label;
      action.removeAttribute('target');
      action.removeAttribute('rel');
    });
  }

  function connectHomeCards() {
    const map = {
      'Brumas de Ambiente': 'produto-bruma-ambiente.html',
      'Escalda-Pés': 'produto-escalda-pes.html',
      'Óleo de Massagem': 'produto-oleo-massagem.html',
      'Águas de Lençóis': 'produto-aguas-lencois.html'
    };

    document.querySelectorAll('#explorar .catalogue-card').forEach(card => {
      const title = card.querySelector('.catalogue-card__title')?.textContent.trim();
      if (!title || !map[title]) return;
      const action = card.querySelector('a.btn');
      if (!action) return;
      action.href = map[title];
      action.textContent = 'Ver produto';
    });
  }

  function addProductBreadcrumbSchema() {
    if (!page.startsWith('produto-') || document.getElementById('product-breadcrumb-schema')) return;
    const title = document.querySelector('h1')?.textContent.trim() || document.title;
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'product-breadcrumb-schema';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'MAISON JF®', item: 'https://maison-jf.com/' },
        { '@type': 'ListItem', position: 2, name: 'Produtos', item: 'https://maison-jf.com/produtos.html' },
        { '@type': 'ListItem', position: 3, name: title, item: window.location.href.split('#')[0] }
      ]
    });
    document.head.appendChild(schema);
  }

  if (page === 'produtos.html') connectProductCards();
  if (page === 'index.html') connectHomeCards();
  addProductBreadcrumbSchema();
})();
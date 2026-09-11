/* MAISON JF® | páginas individuais de produto e caminho comercial */
(function () {
  'use strict';

  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const products = {
    'brumas': { href: 'produto-bruma-ambiente.html', label: 'Ver Bruma', name: 'Brumas de Ambiente MAISON JF®' },
    'escalda-pes': { href: 'produto-escalda-pes.html', label: 'Ver Escalda-Pés', name: 'Escalda-Pés MAISON JF®' },
    'oleo': { href: 'produto-oleo-massagem.html', label: 'Ver Óleo de Massagem', name: 'Óleo de Massagem MAISON JF®' },
    'aguas-lencois': { href: 'produto-aguas-lencois.html', label: 'Ver Águas de Lençóis', name: 'Águas de Lençóis MAISON JF®' },
    'velas': { href: 'produto-vela-aromatica.html', label: 'Ver Vela Aromática', name: 'Velas Aromáticas MAISON JF®' }
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
      'Águas de Lençóis': 'produto-aguas-lencois.html',
      'Velas Aromáticas': 'produto-vela-aromatica.html'
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

  function addCatalogueSchema() {
    if (page !== 'produtos.html' || document.getElementById('maison-product-pages-schema')) return;
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'maison-product-pages-schema';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Produtos MAISON JF®',
      itemListElement: Object.values(products).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `https://maison-jf.com/${item.href}`
      }))
    });
    document.head.appendChild(schema);
  }

  function addProductBreadcrumbSchema() {
    if (!page.startsWith('produto-') || document.getElementById('product-breadcrumb-schema')) return;
    const productName = document.querySelector('.detail-kicker')?.textContent.trim() || document.title;
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'product-breadcrumb-schema';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'MAISON JF®', item: 'https://maison-jf.com/' },
        { '@type': 'ListItem', position: 2, name: 'Produtos', item: 'https://maison-jf.com/produtos.html' },
        { '@type': 'ListItem', position: 3, name: productName, item: window.location.href.split('#')[0] }
      ]
    });
    document.head.appendChild(schema);
  }

  if (page === 'produtos.html') connectProductCards();
  if (page === 'index.html') connectHomeCards();
  addCatalogueSchema();
  addProductBreadcrumbSchema();
})();
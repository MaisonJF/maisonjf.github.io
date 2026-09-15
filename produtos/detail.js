(function(){
  const track=(name,data)=>window.maisonAnalytics?.track?window.maisonAnalytics.track(name,data):(window.__maisonAnalyticsQueue=window.__maisonAnalyticsQueue||[]).push([name,data]);
  const money=n=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(n);
  const all=window.MAISON_PRODUCTS||[];
  const page=document.querySelector('#page');
  if(!page)return;

  const pathParts=location.pathname.split('/').filter(Boolean);
  const pathSlug=pathParts[pathParts.indexOf('produtos')+1];
  const params=new URLSearchParams(location.search);
  const slug=(pathSlug&&pathSlug!=='produto.html'&&pathSlug!=='index.html')?pathSlug:(params.get('slug')||params.get('produto'));
  const p=all.find(x=>x.slug===slug);

  if(!p){
    document.title='Produto não encontrado | MAISON JF®';
    page.innerHTML='<section class="not-found"><p class="eyebrow">MAISON JF®</p><h1>Esse produto não está nesta prateleira.</h1><p>Não te vou mostrar outro produto como se fosse o que escolheste.</p><a class="button button--light" href="../">Ver o catálogo actual</a></section>';
    return;
  }

  document.title=`${p.name} | MAISON JF®`;
  const canonical=document.querySelector('link[rel="canonical"]');
  const productUrl='https://maison-jf.com/produtos/'+encodeURIComponent(p.slug)+'/';
  if(canonical)canonical.href=productUrl;
  const schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.textContent=JSON.stringify({
    '@context':'https://schema.org',
    '@type':'Product',
    name:p.name+(p.size?' '+p.size:''),
    description:p.description,
    url:productUrl,
    brand:{'@type':'Brand',name:'MAISON JF®'},
    offers:p.price!=null?{'@type':'Offer',price:Number(p.price).toFixed(2),priceCurrency:p.currency||'EUR',url:productUrl}:undefined
  });
  document.head.appendChild(schema);
  const media=p.media||[];
  const root=location.pathname.includes('/produtos/'+p.slug+'/')?'../../':'../';
  const fallback=p.category==='Casa'
    ? {role:'ambience',src:'../images/root/casa-ambiente.webp',alt:'Atmosfera de casa MAISON JF',aspect:'portrait',editorial:true}
    : {role:'ambience',src:'../resolver.jpg',alt:'Atmosfera editorial MAISON JF',aspect:'portrait',editorial:true};
  const hero=media.find(m=>m.role==='hero')||media[0]||fallback;
  const rest=media.filter(m=>m!==hero);
  const contact=`${root}contacto/?produto=${encodeURIComponent(p.slug)}&preco=${encodeURIComponent(p.priceNote||money(p.price))}`;
  const ritual=p.ritual||{title:'Leva o ritual para casa.',text:'Um gesto pequeno pode mudar a forma como o momento se sente.'};
  const complementary={Corpo:['vela-vidro','nevoa'],Casa:['escalda-pes','oleo-massagem']}[p.category]||[];
  const related=(p.related||complementary).map(s=>all.find(x=>x.slug===s)).filter(Boolean).slice(0,3);

  const mediaMarkup=rest.length?`
    <section class="product-gallery" aria-label="Imagens editoriais de ${p.name}">
      ${rest.map((m,i)=>`<figure class="product-gallery__item product-gallery__item--${m.aspect||'portrait'}" data-role="${m.role||'editorial'}"><img src="${root}${m.src.replace(/^\.\.\//,'')}" alt="${m.alt||p.name}" loading="lazy"></figure>`).join('')}
    </section>`: '';

  page.innerHTML=`
    <section class="product-hero">
      <div class="media-slot media-slot--portrait product-hero__media ${hero.editorial?'product-hero__media--editorial':''}">
        <img src="${root}${hero.src.replace(/^\.\.\//,'')}" alt="${hero.alt||p.name}">
      </div>
      <div class="product-hero__copy">
        <p class="eyebrow">${p.category} · MAISON JF®</p>
        <h1>${p.name}${p.size?` <span style="font-size:.35em">${p.size}</span>`:''}</h1>
        <p>${p.description}</p>
        <div class="product-price">${p.priceNote||money(p.price)}</div>
        <div class="product-actions">
          <a class="button button--light" data-buy href="${contact}">${p.cta}</a>
          <a class="text-link" href="${root}teste/">Não sei se é isto</a>
        </div>
        <div class="product-meta-links">
          <a href="${root}envios.html">Envios</a>
          <a href="${root}informacao-legal.html">Condições</a>
        </div>
      </div>
    </section>

    ${mediaMarkup}

    <section class="ritual product-ritual">
      <div>
        <p class="eyebrow">Leva-o contigo</p>
        <h2>${ritual.title}</h2>
        <p>${ritual.text}</p>
      </div>
      <div>
        <p class="eyebrow">Se isto for só a entrada</p>
        <h2>O próximo passo não tem de ser outro produto.</h2>
        <p>Uma pausa pode chegar. Também pode abrir uma pergunta. Se quiseres continuar, a Maison continua contigo.</p>
        <a class="text-link" href="${root}servicos/#acompanhamento">Ver Acompanhamentos</a><br>
        <a class="text-link" href="${root}teste/">Fazer O QUE ESTÁS A IGNORAR?</a>
      </div>
    </section>

    ${related.length?`<section class="related"><p class="eyebrow">Pode fazer sentido contigo</p><h2>Continua o ritual.</h2><div class="related-grid">${related.map(r=>`<a class="related-card" data-related="${r.slug}" href="${root}produtos/${r.slug}/"><small>${r.category}</small><strong>${r.name}${r.size?` · ${r.size}`:''}</strong><span>${r.priceNote||money(r.price)} · Ver</span></a>`).join('')}</div></section>`:''}
  `;

  track('maison_product_view',{product:p.slug,price:p.price,page_path:location.pathname});
  page.addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy]');
    const rel=e.target.closest('[data-related]');
    if(buy)track('product_contact_click',{product:p.slug,price:p.price,page_path:location.pathname});
    if(rel)track('product_cross_sell',{from:p.slug,to:rel.dataset.related,page_path:location.pathname});
  });
})();

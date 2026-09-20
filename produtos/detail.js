(function(){
  const track=(name,data)=>window.maisonAnalytics?.track?window.maisonAnalytics.track(name,data):(window.__maisonAnalyticsQueue=window.__maisonAnalyticsQueue||[]).push([name,data]);
  const money=n=>{const v=Number(n);const whole=Number.isInteger(v);return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',minimumFractionDigits:whole?0:2,maximumFractionDigits:whole?0:2}).format(v)};
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
  const hero=media.find(m=>m.role==='hero')||media[0]||null;
  const rest=hero?media.filter(m=>m!==hero):media;
  const whatsapp=`https://wa.me/351923318289?text=${encodeURIComponent(`Olá Maison JF. Tenho uma dúvida sobre ${p.name}${p.size?' '+p.size:''}.`)}`;
  const ritual=p.ritual||{title:'Leva o ritual para casa.',text:'Um gesto pequeno pode mudar a forma como o momento se sente.'};
  const complementary={Corpo:['vela-vidro','nevoa'],Casa:['escalda-pes','oleo-massagem']}[p.category]||[];
  const related=(p.related||complementary).map(s=>all.find(x=>x.slug===s)).filter(Boolean).slice(0,2);

  const mediaMarkup=rest.length?`
    <section class="product-gallery" aria-label="Imagens editoriais de ${p.name}">
      ${rest.map((m,i)=>`<figure class="product-gallery__item product-gallery__item--${m.aspect||'portrait'}" data-role="${m.role||'editorial'}"><img src="${root}${m.src.replace(/^\.\.\//,'')}" alt="${m.alt||p.name}" loading="lazy"></figure>`).join('')}
    </section>`: '';

  page.innerHTML=`
    <section class="product-hero ${hero?'':'product-hero--no-media'}">
      ${hero?`<div class="media-slot media-slot--portrait product-hero__media ${hero.editorial?'product-hero__media--editorial':''}">
        <img src="${root}${hero.src.replace(/^\.\.\//,'')}" alt="${hero.alt||p.name}">
      </div>`:''}
      <div class="product-hero__copy">
        <p class="eyebrow">${p.category} · MAISON JF®</p>
        <h1>${p.name}${p.size?` <span style="font-size:.35em">${p.size}</span>`:''}</h1>
        <p>${p.description}</p>
        <div class="product-price">${p.priceNote||money(p.price)}</div>
        <div class="product-actions">
          <button class="button button--light" data-buy type="button">Comprar · ${p.priceNote||money(p.price)}</button>
          <button class="text-link" data-cart-add type="button" style="background:none;border:0;padding:0;cursor:pointer">Adicionar ao carrinho</button>
          <a class="text-link" data-cart-link href="${root}produtos/carrinho/">Carrinho</a>
          <a class="text-link" data-whatsapp href="${whatsapp}" target="_blank" rel="noopener noreferrer">Tenho uma dúvida</a>
        </div>
        <p class="product-checkout-status" data-checkout-status aria-live="polite"></p>
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
        <p class="eyebrow">Não é isto?</p>
        <h2>Não adivinhes.</h2>
        <p>Entra pelo que queres sentir.</p>
        <a class="text-link" href="${root}farol#farol">Seguir o Farol →</a>
      </div>
    </section>

    ${related.length?`<section class="related"><p class="eyebrow">Pode fazer sentido contigo</p><h2>Continua o ritual.</h2><div class="related-grid">${related.map(r=>`<a class="related-card" data-related="${r.slug}" href="${root}produtos/${r.slug}/"><small>${r.category}</small><strong>${r.name}${r.size?` · ${r.size}`:''}</strong><span>${r.priceNote||money(r.price)} · Ver</span></a>`).join('')}</div></section>`:''}
  `;

  track('maison_product_view',{product:p.slug,price:p.price,page_path:location.pathname});
  const CART_KEY='maisonPhysicalCartV1';
  const readCart=()=>{try{const raw=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(raw)?raw:[]}catch{return[]}};
  const writeCart=items=>{try{localStorage.setItem(CART_KEY,JSON.stringify(items))}catch{}};
  function addToCart(slug){
    const items=readCart();
    const found=items.find(item=>item.slug===slug);
    if(found)found.quantity=Math.min(10,(Number(found.quantity)||1)+1);
    else items.push({slug,quantity:1});
    writeCart(items);
    const count=items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
    page.querySelectorAll('[data-cart-link]').forEach(link=>link.textContent='Carrinho ('+count+')');
    return count;
  }
  const initialCount=readCart().reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
  if(initialCount)page.querySelectorAll('[data-cart-link]').forEach(link=>link.textContent='Carrinho ('+initialCount+')');

  page.addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy]');
    const add=e.target.closest('[data-cart-add]');
    const whatsappLink=e.target.closest('[data-whatsapp]');
    const rel=e.target.closest('[data-related]');
    const status=page.querySelector('[data-checkout-status]');
    if(add){
      addToCart(p.slug);
      if(status)status.textContent='Adicionado ao carrinho.';
      track('physical_cart_add',{product:p.slug,price:p.price,page_path:location.pathname});
    }
    if(buy){
      addToCart(p.slug);
      track('product_checkout_intent',{product:p.slug,price:p.price,page_path:location.pathname});
      location.href=root+'produtos/carrinho/';
    }
    if(whatsappLink)track('product_whatsapp_question',{product:p.slug,price:p.price,page_path:location.pathname});
    if(rel)track('product_cross_sell',{from:p.slug,to:rel.dataset.related,page_path:location.pathname});
  });
})();

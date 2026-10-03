(function(){
  const locale=String(window.MAISON_LOCALE||document.documentElement.lang||'pt-PT');
  const copy={
    en:{notFoundTitle:'Product not found | MAISON JF®',notFound:'That product is not on this shelf.',notFoundBody:"I won't show you another product as if it were the one you chose.",catalogue:'View current catalogue',gallery:'Editorial images of',question:'Hi, João. I have a question about',ritualTitle:'Take the ritual home.',ritualText:'A small gesture can change how a moment feels.',order:'Continue to order',add:'Add to cart',cart:'Cart',doubt:'I have a question',shipping:'Shipping',conditions:'Terms',take:'Take it with you',notThis:'Not this one?',dontGuess:"Don't guess.",feel:'Enter through what you want to feel.',lighthouse:'Follow the Lighthouse →',continue:'If you want to continue',related:'Maybe this makes sense for you.',view:'View',added:'Added to cart.'},
    es:{notFoundTitle:'Producto no encontrado | MAISON JF®',notFound:'Ese producto no está en esta estantería.',notFoundBody:'No voy a mostrarte otro producto como si fuera el que elegiste.',catalogue:'Ver catálogo actual',gallery:'Imágenes editoriales de',question:'Hola, João. Tengo una duda sobre',ritualTitle:'Lleva el ritual a casa.',ritualText:'Un pequeño gesto puede cambiar cómo se siente un momento.',order:'Continuar al pedido',add:'Añadir al carrito',cart:'Carrito',doubt:'Tengo una duda',shipping:'Envíos',conditions:'Condiciones',take:'Llévalo contigo',notThis:'¿No es esto?',dontGuess:'No adivines.',feel:'Entra por lo que quieres sentir.',lighthouse:'Seguir el Faro →',continue:'Si quieres continuar',related:'Quizá esto tenga sentido para ti.',view:'Ver',added:'Añadido al carrito.'},
    'pt-BR':{notFoundTitle:'Produto não encontrado | MAISON JF®',notFound:'Esse produto não está nesta prateleira.',notFoundBody:'Não vou mostrar outro produto como se fosse o que você escolheu.',catalogue:'Ver catálogo atual',gallery:'Imagens editoriais de',question:'Olá, João. Tenho uma dúvida sobre',ritualTitle:'Leve o ritual para casa.',ritualText:'Um pequeno gesto pode mudar a forma como o momento é sentido.',order:'Continuar para o pedido',add:'${t.add}',cart:'Carrinho',doubt:'Tenho uma dúvida',shipping:'Envios',conditions:'Condições',take:'Leve com você',notThis:'Não é isso?',dontGuess:'Não adivinhe.',feel:'Entre pelo que você quer sentir.',lighthouse:'${t.lighthouse}',continue:'Se quiser continuar',related:'Talvez isso faça sentido para você.',view:'Ver',added:'Adicionado ao carrinho.'}
  };
  const t=copy[locale]||{notFoundTitle:'Produto não encontrado | MAISON JF®',notFound:'Esse produto não está nesta prateleira.',notFoundBody:'Não te vou mostrar outro produto como se fosse o que escolheste.',catalogue:'Ver o catálogo actual',gallery:'Imagens editoriais de',question:'Olá, João. Tenho uma dúvida sobre',ritualTitle:'Leva o ritual para casa.',ritualText:'Um gesto pequeno pode mudar a forma como o momento se sente.',order:'${t.order}',add:'${t.add}',cart:'Carrinho',doubt:'Tenho uma dúvida',shipping:'Envios',conditions:'Condições',take:'${t.take}',notThis:'${t.notThis}',dontGuess:'${t.dontGuess}',feel:'${t.feel}',lighthouse:'${t.lighthouse}',continue:'${t.continue}',related:'${t.related}',view:'Ver',added:'Adicionado ao carrinho.'};
  const track=(name,data)=>window.maisonAnalytics?.track?window.maisonAnalytics.track(name,data):(window.__maisonAnalyticsQueue=window.__maisonAnalyticsQueue||[]).push([name,data]);
  const money=n=>{const v=Number(n);const whole=Number.isInteger(v);return new Intl.NumberFormat(locale==='en'?'en-IE':locale==='es'?'es-ES':locale,{style:'currency',currency:'EUR',minimumFractionDigits:whole?0:2,maximumFractionDigits:whole?0:2}).format(v)};
  const all=window.MAISON_PRODUCTS||[];
  const page=document.querySelector('#page');
  if(!page)return;

  const pathParts=location.pathname.split('/').filter(Boolean);
  const pathSlug=pathParts[pathParts.indexOf('produtos')+1];
  const params=new URLSearchParams(location.search);
  const slug=(pathSlug&&pathSlug!=='produto.html'&&pathSlug!=='index.html')?pathSlug:(params.get('slug')||params.get('produto'));
  const p=all.find(x=>x.slug===slug);

  if(!p){
    document.title=t.notFoundTitle;
    page.innerHTML='<section class="not-found"><p class="eyebrow">MAISON JF®</p><h1>'+t.notFound+'</h1><p>'+t.notFoundBody+'</p><a class="button button--light" href="../">'+t.catalogue+'</a></section>';
    return;
  }

  document.title=`${p.name}${p.size?' '+p.size:''} | MAISON JF®`;
  const canonical=document.querySelector('link[rel="canonical"]');
  const productUrl='https://maison-jf.com/produtos/'+encodeURIComponent(p.slug)+'/';
  if(canonical)canonical.href=productUrl;
  const schema=document.querySelector('[data-product-schema]')||document.createElement('script');
  schema.type='application/ld+json';
  schema.dataset.productSchema='';
  const availabilityMap={in_stock:'https://schema.org/InStock',out_of_stock:'https://schema.org/OutOfStock',preorder:'https://schema.org/PreOrder'};
  const conditionMap={new:'https://schema.org/NewCondition',used:'https://schema.org/UsedCondition',refurbished:'https://schema.org/RefurbishedCondition'};
  const structured={
    '@context':'https://schema.org',
    '@type':'Product',
    name:p.name+(p.size?' '+p.size:''),
    description:p.description,
    url:productUrl,
    sku:p.sku||undefined,
    brand:{'@type':'Brand',name:'MAISON JF®'},
    image:p.productImage?[new URL(p.productImage,location.origin).href]:undefined,
    offers:p.price!=null?{'@type':'Offer',price:Number(p.price).toFixed(2),priceCurrency:p.currency||'EUR',url:productUrl,availability:availabilityMap[p.availability],itemCondition:conditionMap[p.condition]}:undefined
  };
  schema.textContent=JSON.stringify(structured);
  if(!schema.isConnected)document.head.appendChild(schema);
  const media=p.media||[];
  const root=location.pathname.includes('/produtos/'+p.slug+'/')?'../../':'../';
  const hero=media.find(m=>m.role==='hero')||media[0]||null;
  const rest=hero?media.filter(m=>m!==hero):media;
  const whatsapp=`https://wa.me/351923318289?text=${encodeURIComponent(`${t.question} ${p.name}${p.size?' '+p.size:''}.`)}`;
  const ritual=p.ritual||{title:t.ritualTitle,text:t.ritualText};
  const complementary={Corpo:['vela-vidro','nevoa'],Casa:['escalda-pes','oleo-massagem']}[p.category]||[];
  const related=(p.related||complementary).map(s=>all.find(x=>x.slug===s)).filter(Boolean).slice(0,2);

  const mediaMarkup=rest.length?`
    <section class="product-gallery" aria-label="${t.gallery} ${p.name}">
      ${rest.map((m,i)=>`<figure class="product-gallery__item product-gallery__item--${m.aspect||'portrait'}" data-role="${m.role||'editorial'}"><img src="${root}${m.src.replace(/^\.\.\//,'')}" alt="${m.alt||p.name}" loading="lazy"></figure>`).join('')}
    </section>`: '';

  page.innerHTML=`
    <section class="product-hero ${hero?'':'product-hero--no-media'}">
      ${hero?`<div class="media-slot media-slot--${hero.aspect||'portrait'} product-hero__media ${hero.editorial?'product-hero__media--editorial':''}">
        <img src="${root}${hero.src.replace(/^\.\.\//,'')}" alt="${hero.alt||p.name}">
      </div>`:''}
      <div class="product-hero__copy">
        <p class="eyebrow">${p.category} · MAISON JF®</p>
        <h1>${p.name}${p.size?` <span style="font-size:.35em">${p.size}</span>`:''}</h1>
        <p>${p.description}</p>
        <div class="product-price">${p.priceNote||money(p.price)}</div>
        <div class="product-actions">
          <button class="button button--light" data-buy type="button">${t.order}</button>
          <button class="text-link" data-cart-add type="button" style="background:none;border:0;padding:0;cursor:pointer">${t.add}</button>
          <a class="text-link" data-cart-link href="${root}produtos/carrinho/">${t.cart}</a>
          <a class="text-link" data-whatsapp href="${whatsapp}" target="_blank" rel="noopener noreferrer">${t.doubt}</a>
        </div>
        <p class="product-checkout-status" data-checkout-status aria-live="polite"></p>
        <div class="product-meta-links">
          <a href="${root}envios">${t.shipping}</a>
          <a href="${root}informacao-legal">${t.conditions}</a>
        </div>
      </div>
    </section>

    ${mediaMarkup}

    <section class="ritual product-ritual">
      <div>
        <p class="eyebrow">${t.take}</p>
        <h2>${ritual.title}</h2>
        <p>${ritual.text}</p>
      </div>
      <div>
        <p class="eyebrow">${t.notThis}</p>
        <h2>${t.dontGuess}</h2>
        <p>${t.feel}</p>
        <a class="text-link" href="${root}farol">${t.lighthouse}</a>
      </div>
    </section>

    ${related.length?`<section class="related"><p class="eyebrow">${t.continue}</p><h2>${t.related}</h2><div class="related-grid">${related.map(r=>`<a class="related-card" data-related="${r.slug}" href="${root}produtos/${r.slug}/"><small>${r.category}</small><strong>${r.name}${r.size?` · ${r.size}`:''}</strong><span>${r.priceNote||money(r.price)} · ${t.view}</span></a>`).join('')}</div></section>`:''}
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
    page.querySelectorAll('[data-cart-link]').forEach(link=>link.textContent=t.cart+' ('+count+')');
    return count;
  }
  const initialCount=readCart().reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
  if(initialCount)page.querySelectorAll('[data-cart-link]').forEach(link=>link.textContent=t.cart+' ('+initialCount+')');

  page.addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy]');
    const add=e.target.closest('[data-cart-add]');
    const whatsappLink=e.target.closest('[data-whatsapp]');
    const rel=e.target.closest('[data-related]');
    const status=page.querySelector('[data-checkout-status]');
    if(add){
      addToCart(p.slug);
      if(status)status.textContent=t.added;
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

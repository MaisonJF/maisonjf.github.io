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
  const media=p.media||[];
  const hero=media.find(m=>m.role==='hero')||media[0];
  const rest=media.filter(m=>m!==hero);
  const root=location.pathname.includes('/produtos/'+p.slug+'/')?'../../':'../';
  const contact=`${root}contacto/?produto=${encodeURIComponent(p.slug)}&preco=${encodeURIComponent(p.priceNote||money(p.price))}`;

  const defaults={
    'escalda-pes':['Não compliques a pausa.','Prepara água morna, deixa os pés parar primeiro e dá ao resto de ti alguns minutos para chegar depois. Não precisa de ser uma cerimónia perfeita para ser tua.'],
    'vela-vidro':['Acende para mudar de ritmo.','Usa a luz e o aroma como marcador: o trabalho acabou, a casa começou, ou simplesmente este momento é diferente do anterior.'],
    'vela-pequena':['Um gesto pequeno também conta.','Escolhe um canto, acende e deixa que aquele ponto de luz marque alguns minutos que não precisam de servir para mais nada.'],
    'oleo-massagem':['O corpo percebe o toque antes da explicação.','Usa o óleo num momento de massagem a solo ou acompanhado e deixa o ritual ter princípio e fim, em vez de ser mais uma coisa feita à pressa.'],
    'nevoa':['Muda o ar antes de mudares tudo.','Alguns gestos no espaço bastam para assinalar outra atmosfera. Usa a Névoa de Ambiente quando queres uma mudança imediata de aroma.']
  };
  const ritual=p.ritual?[p.ritual.title,p.ritual.text]:(defaults[p.slug]||['Leva o ritual para casa.','Usa este produto como um gesto deliberado de pausa e presença.']);
  const complementary={Corpo:['vela-vidro','nevoa'],Casa:['escalda-pes','oleo-massagem']}[p.category]||[];
  const related=(p.related||complementary).map(s=>all.find(x=>x.slug===s)).filter(Boolean).slice(0,3);

  const detailBlocks=[];
  if(p.usage) detailBlocks.push(`<div><h3>Como usar</h3><p>${p.usage}</p></div>`);
  if(p.production) detailBlocks.push(`<div><h3>Produção</h3><p>${p.production}</p></div>`);
  if(p.safety) detailBlocks.push(`<div><h3>Cuidados</h3><p>${p.safety}</p></div>`);
  if(p.ingredients) detailBlocks.push(`<div><h3>Ingredientes</h3><p>${p.ingredients}</p></div>`);
  if(p.nominal||p.pao) detailBlocks.push(`<div><h3>Informação</h3><p>${[p.nominal?'Conteúdo nominal: '+p.nominal:null,p.pao?'PAO: '+p.pao:null].filter(Boolean).join(' · ')}</p></div>`);

  page.innerHTML=`
    <section class="product-hero">
      <div class="media-slot media-slot--portrait">${hero?`<img src="${root}${hero.src.replace(/^\.\.\//,'')}" alt="${hero.alt}">`:'<div aria-hidden="true"></div>'}</div>
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
          ${detailBlocks.length?'<a href="#detalhes">Detalhes do produto</a>':''}
          <a href="${root}envios.html">Envios</a>
          <a href="${root}informacao-legal.html">Condições</a>
        </div>
      </div>
    </section>
    ${rest.length?`<section class="gallery">${rest.map(m=>`<div class="media-slot"><img src="${root}${m.src.replace(/^\.\.\//,'')}" alt="${m.alt}" loading="lazy"></div>`).join('')}</section>`:''}
    <section class="ritual">
      <div><p class="eyebrow">Leva-o contigo</p><h2>${ritual[0]}</h2><p>${ritual[1]}</p></div>
      <div><p class="eyebrow">Se isto for só a entrada</p><h2>O próximo passo não tem de ser outro produto.</h2><p>Uma pausa pode chegar. Também pode abrir uma pergunta. Se quiseres olhar para o que está por trás com continuidade, vê os Acompanhamentos; se ainda não sabes o que precisas, faz o teste.</p><a class="text-link" href="${root}servicos/#acompanhamento">Ver Acompanhamentos</a><br><a class="text-link" href="${root}teste/">Fazer O QUE ESTÁS A IGNORAR?</a></div>
    </section>
    ${related.length?`<section class="related"><p class="eyebrow">Pode fazer sentido contigo</p><h2>Continua o ritual.</h2><div class="related-grid">${related.map(r=>`<a class="related-card" data-related="${r.slug}" href="${root}produtos/${r.slug}/"><small>${r.category}</small><strong>${r.name}${r.size?` · ${r.size}`:''}</strong><span>${r.priceNote||money(r.price)} · Ver</span></a>`).join('')}</div></section>`:''}
    ${detailBlocks.length?`<details class="product-facts" id="detalhes"><summary>Detalhes do produto</summary><div class="product-facts__grid">${detailBlocks.join('')}</div></details>`:''}
  `;

  track('maison_product_view',{product:p.slug,price:p.price,page_path:location.pathname});
  page.addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy]');
    const rel=e.target.closest('[data-related]');
    if(buy)track('product_contact_click',{product:p.slug,price:p.price,page_path:location.pathname});
    if(rel)track('product_cross_sell',{from:p.slug,to:rel.dataset.related,page_path:location.pathname});
  });
})();

(function(){
  const allowed={
    b2b_business:new Set(['loja','spa','terapeuta','alojamento','servico','outro']),
    b2b_goal:new Set(['ticket','recompra','diferenciar','continuar','boasvindas','testar','presentear']),
    b2b_gap:new Set(['fim','extra','assinatura','escolha','stock','historia']),
    b2b_client:new Set(['recorrente','ocasional','turista','presente','misto']),
    b2b_model:new Set(['revenda','uso','ambos','boasvindas','especial','presente']),
    b2b_scale:new Set(['pequeno','regular','recorrente','projeto']),
    b2b_start:new Set(['curadoria','categoria','proposta','conversa']),
    b2b_result:new Set(['gifting','welcome','continuity','ticket','signature','resale','pilot','proposal'])
  };
  const source=new URLSearchParams(location.search);
  const context={};
  for(const [key,values] of Object.entries(allowed)){
    const value=source.get(key);
    if(value&&values.has(value))context[key]=value;
  }
  if(!Object.keys(context).length)return;
  document.querySelectorAll('a[href]').forEach(link=>{
    const raw=link.getAttribute('href')||'';
    if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:'))return;
    let url;
    try{url=new URL(raw,location.href)}catch{return}
    if(url.origin!==location.origin)return;
    const isProfessional=url.pathname.includes('/profissionais/');
    const interest=url.searchParams.get('interesse')||'';
    const isB2bContact=url.pathname.includes('/contacto/')&&interest.startsWith('b2b');
    if(!isProfessional&&!isB2bContact)return;
    for(const [key,value] of Object.entries(context)){
      if(!url.searchParams.has(key))url.searchParams.set(key,value);
    }
    if(isB2bContact&&!url.searchParams.has('origem'))url.searchParams.set('origem','profissionais');
    link.href=url.href;
  });
})();
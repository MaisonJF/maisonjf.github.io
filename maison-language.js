(() => {
  'use strict';


  const SITE_LOCALES = {
    'pt-PT': { prefix: '', label: 'PT', lang: 'pt-PT' },
    'pt-BR': { prefix: '/pt-br', label: 'BR', lang: 'pt-BR' },
    en: { prefix: '/en', label: 'EN', lang: 'en' },
    es: { prefix: '/es', label: 'ES', lang: 'es' }
  };

  function currentLocale(){
    const explicit=window.MAISON_LOCALE||document.documentElement.lang||'pt-PT';
    const raw=String(explicit).toLowerCase();
    if(raw.startsWith('pt-br'))return 'pt-BR';
    if(raw.startsWith('en'))return 'en';
    if(raw.startsWith('es'))return 'es';
    return 'pt-PT';
  }

  function sourcePath(){
    let path=location.pathname||'/';
    for(const config of Object.values(SITE_LOCALES)){
      if(!config.prefix)continue;
      if(path===config.prefix||path===config.prefix+'/')return '/';
      if(path.startsWith(config.prefix+'/'))return path.slice(config.prefix.length)||'/';
    }
    return path;
  }

  function localizedPath(path,locale){
    const config=SITE_LOCALES[locale]||SITE_LOCALES['pt-PT'];
    const clean=path||'/';
    return locale==='pt-PT'?clean:config.prefix+(clean==='/'?'/':clean);
  }

  function ensureLanguageSwitcher(){
    if(!window.MAISON_I18N_AVAILABLE)return;
    if(document.querySelector('.maison-language-switcher'))return;
    const style=document.createElement('style');
    style.id='maison-language-switcher-style-client';
    style.textContent='.maison-language-switcher{position:fixed;z-index:2147483000;top:18px;right:18px;display:flex;gap:2px;padding:3px;border:1px solid rgba(199,170,115,.26);background:rgba(7,7,7,.76);backdrop-filter:blur(14px);border-radius:999px}.maison-language-switcher a{display:grid;place-items:center;min-width:31px;height:27px;padding:0 7px;border-radius:999px;color:rgba(245,241,233,.68);font:600 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-decoration:none}.maison-language-switcher a:hover,.maison-language-switcher a:focus-visible,.maison-language-switcher a[aria-current="page"]{background:rgba(199,170,115,.16);color:#f5f1e9;outline:none}@media(max-width:700px){.maison-language-switcher{top:12px;right:12px}.maison-language-switcher a{min-width:29px;height:25px;padding:0 6px}}';
    document.head.appendChild(style);
    const nav=document.createElement('nav');
    nav.className='maison-language-switcher';
    nav.setAttribute('aria-label','Language');
    const active=currentLocale();
    const path=sourcePath();
    Object.entries(SITE_LOCALES).forEach(([locale,config])=>{
      const link=document.createElement('a');
      link.href=localizedPath(path,locale)+location.search+location.hash;
      link.hreflang=locale;
      link.lang=config.lang;
      link.textContent=config.label;
      if(locale===active)link.setAttribute('aria-current','page');
      nav.appendChild(link);
    });
    document.body.appendChild(nav);
  }

  const MAP = new Map(Object.entries({
    'afeto':'afecto','afetos':'afectos','afetiva':'afectiva','afetivas':'afectivas','afetivo':'afectivo','afetivos':'afectivos',
    'ação':'acção','ações':'acções',
    'atividade':'actividade','atividades':'actividades','ativo':'activo','ativos':'activos','ativa':'activa','ativas':'activas',
    'atual':'actual','atuais':'actuais','atualmente':'actualmente','atualização':'actualização','atualizações':'actualizações','atualizado':'actualizado','atualizada':'actualizada',
    'arquitetura':'arquitectura','arquiteturas':'arquitecturas','arquiteto':'architecto','arquitetos':'architectos',
    'projeto':'projecto','projetos':'projectos','projetar':'projectar','projetado':'projectado','projetada':'projectada',
    'objetivo':'objectivo','objetivos':'objectivos','objetiva':'objectiva','objetivas':'objectivas','objeto':'objecto','objetos':'objectos',
    'direção':'direcção','direções':'direcções','direto':'directo','diretos':'directos','direta':'directa','diretas':'directas','diretamente':'directamente','diretor':'director','diretores':'directores','diretora':'directora',
    'correto':'correcto','corretos':'correctos','correta':'correcta','corretas':'correctas','correção':'correcção','correções':'correcções',
    'seleção':'selecção','seleções':'selecções','selecionar':'seleccionar','selecionado':'seleccionado','selecionada':'seleccionada','selecionados':'seleccionados','selecionadas':'seleccionadas',
    'coleção':'colecção','coleções':'colecções','colecionar':'coleccionar','colecionador':'coleccionador','colecionadores':'coleccionadores',
    'proteção':'protecção','proteções':'protecções',
    'receção':'recepção','receções':'recepções',
    'conceção':'concepção','conceções':'concepções',
    'perspetiva':'perspectiva','perspetivas':'perspectivas',
    'aspeto':'aspecto','aspetos':'aspectos',
    'espetáculo':'espectáculo','espetáculos':'espectáculos',
    'deteção':'detecção','deteções':'detecções','detetar':'detectar','detetado':'detectado','detetada':'detectada',
    'setor':'sector','setores':'sectores',
    'vetor':'vector','vetores':'vectores',
    'fatura':'factura','faturas':'facturas','faturação':'facturação',
    'caráter':'carácter',
    'ótimo':'óptimo','ótimos':'óptimos','ótima':'óptima','ótimas':'óptimas','ótica':'óptica','óticas':'ópticas',
    'adoção':'adopção','adoções':'adopções','adotar':'adoptar','adotado':'adoptado','adotada':'adoptada',
    'interação':'interacção','interações':'interacções',
    'reação':'reacção','reações':'reacções','reativar':'reactivar','reativação':'reactivação',
    'efetivo':'efectivo','efetivos':'efectivos','efetiva':'efectiva','efetivas':'efectivas','efetivamente':'efectivamente',
    'refletir':'reflectir','reflete':'reflecte','refletem':'reflectem','refletido':'reflectido','refletida':'reflectida',
    'exceto':'excepto',
    'autoestima':'auto-estima'
  }));

  const escapeRx = value => value.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  const words = [...MAP.keys()].sort((a,b)=>b.length-a.length);
  const rx = new RegExp('(?<![\\p{L}\\p{N}_])(' + words.map(escapeRx).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');

  function preserveCase(source,target){
    if(source===source.toUpperCase()) return target.toUpperCase();
    if(source[0]===source[0].toUpperCase()) return target.charAt(0).toUpperCase()+target.slice(1);
    return target;
  }

  function convert(value){
    if(!value || typeof value!=='string') return value;
    let next=value.replace(rx,match=>preserveCase(match,MAP.get(match.toLowerCase())||match));
    next=next.replace(/\s+[—–]\s+/g,'. ');
    return next;
  }

  function textNode(node){
    const parent=node.parentElement;
    if(!parent || /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA)$/i.test(parent.tagName)) return;
    const next=convert(node.nodeValue);
    if(next!==node.nodeValue) node.nodeValue=next;
  }

  function element(el){
    if(!el || el.nodeType!==1 || /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA)$/i.test(el.tagName)) return;
    ['aria-label','title','alt','placeholder'].forEach(attr=>{
      if(!el.hasAttribute(attr)) return;
      const before=el.getAttribute(attr),after=convert(before);
      if(after!==before) el.setAttribute(attr,after);
    });
    el.childNodes.forEach(node=>{
      if(node.nodeType===3) textNode(node);
      else if(node.nodeType===1) element(node);
    });
  }

  function apply(){
    ensureLanguageSwitcher();
    if(currentLocale()!=='pt-PT'){
      window.MaisonLanguage={convert:value=>value,variant:currentLocale()};
      return;
    }
    document.title=convert(document.title);
    document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach(meta=>{
      const before=meta.getAttribute('content')||'',after=convert(before);
      if(after!==before) meta.setAttribute('content',after);
    });
    element(document.body);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        if(mutation.type==='characterData') textNode(mutation.target);
        mutation.addedNodes?.forEach(node=>{
          if(node.nodeType===3) textNode(node);
          else if(node.nodeType===1) element(node);
        });
      }
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  if(currentLocale()==='pt-PT')window.MaisonLanguage={convert,variant:'pt-PT-pre-AO90-human-voice'};
})();
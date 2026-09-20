(() => {
  'use strict';

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
    return value.replace(rx,match=>preserveCase(match,MAP.get(match.toLowerCase())||match));
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

  window.MaisonLanguage={convert,variant:'pt-PT-pre-AO90'};
})();
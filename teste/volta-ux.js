(function(){
'use strict';

const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stages=[...document.querySelectorAll('.vpc-stage')];
const start=document.getElementById('start');
const count=document.getElementById('count');
const progress=document.querySelector('.vpc-progress');

function moveToStage(stage){
  if(!stage||stage.hidden)return;
  const target=stage.id==='result'
    ? stage.querySelector('h1,h2,[tabindex]')
    : stage.id==='quiz'
      ? stage.querySelector('#question,h2,[tabindex]')
      : stage.querySelector('h1,h2');

  window.requestAnimationFrame(()=>{
    stage.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
    window.setTimeout(()=>{
      if(!target)return;
      if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
      target.focus({preventScroll:true});
    },reduceMotion?0:220);
  });
}

if(start){
  start.addEventListener('click',()=>{
    if(start.disabled)return;
    start.dataset.originalLabel=start.textContent.trim();
    start.textContent='A preparar…';
    start.setAttribute('aria-busy','true');
  },{capture:true});
}

document.addEventListener('click',event=>{
  const choice=event.target.closest('.vpc-choice');
  if(!choice)return;
  choice.closest('.vpc-choices')?.querySelectorAll('.vpc-choice').forEach(button=>{
    button.disabled=true;
    button.setAttribute('aria-disabled','true');
  });
},{capture:true});

if(progress){
  progress.setAttribute('role','progressbar');
  progress.setAttribute('aria-valuemin','1');
}

function syncProgress(){
  if(!progress||!count)return;
  const match=(count.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
  if(!match)return;
  progress.setAttribute('aria-valuenow',match[1]);
  progress.setAttribute('aria-valuemax',match[2]);
  progress.setAttribute('aria-label','Pergunta '+match[1]+' de '+match[2]);
}
syncProgress();

if(count){
  new MutationObserver(syncProgress).observe(count,{childList:true,characterData:true,subtree:true});
}

stages.forEach(stage=>{
  new MutationObserver(mutations=>{
    if(mutations.some(m=>m.attributeName==='hidden')&&!stage.hidden){
      if(start){
        start.removeAttribute('aria-busy');
        if(start.dataset.originalLabel)start.textContent=start.dataset.originalLabel;
      }
      moveToStage(stage);
    }
  }).observe(stage,{attributes:true,attributeFilter:['hidden']});
});
})();
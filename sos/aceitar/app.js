(()=>{
'use strict';

const status=document.getElementById('status');
const accept=document.getElementById('acceptButton');
const decline=document.getElementById('declineButton');

const params=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):'');
const token=String(params.get('token')||'');
history.replaceState(null,'',location.pathname);

function setStatus(message,state){
  status.textContent=message;
  status.dataset.state=state||'';
}
function busy(value){
  accept.disabled=value;
  decline.disabled=value;
}
async function decide(decision){
  if(token.length<20){
    setStatus('Este convite não está disponível. Abre novamente a ligação original que recebeste por email.','error');
    return;
  }
  busy(true);
  setStatus(decision==='accept'?'A confirmar…':'A registar a tua decisão…','');
  try{
    const response=await fetch('/api/sos/contact/accept',{
      method:'POST',
      headers:{'content-type':'application/json'},
      credentials:'same-origin',
      body:JSON.stringify({token,decision})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(String(data.error||'request_failed'));
    document.getElementById('actions').hidden=true;
    if(decision==='accept'){
      setStatus('Aceite. Se um check-in combinado não for confirmado, poderás receber um aviso por email.','success');
    }else{
      setStatus('Recusado. Não receberás avisos deste convite.','success');
    }
  }catch{
    setStatus('Não foi possível guardar a tua decisão. Podes tentar novamente a partir da ligação original.','error');
    busy(false);
  }
}

accept.addEventListener('click',()=>decide('accept'));
decline.addEventListener('click',()=>decide('decline'));

if(token.length<20){
  busy(true);
  setStatus('Este convite não está disponível. Abre novamente a ligação original que recebeste por email.','error');
}
})();

/* MAISON JF® B2B — real contact hand-off + non-identifying lead event.
   /api/b2b-lead is telemetry only; never send personal data there.
   A commercial enquiry is completed when the visitor actually sends WhatsApp/email. */
(function(){
  'use strict';
  const form=document.getElementById('maison-b2b-request');
  if(!form)return;
  const status=document.getElementById('maison-b2b-status');
  const button=form.querySelector('button[type="submit"]');
  const allowedBusiness=new Set(['loja','spa','terapeuta','alojamento','servico','organizacao','outro']);
  const allowedGoal=new Set(['ticket','recompra','diferenciar','continuar','boasvindas','testar','presentear','equipa','formacao']);
  function read(name){return String(new FormData(form).get(name)||'').trim().slice(0,1200)}
  async function signalNonPersonalContext(business,goal){
    const metadata={
      interest:'b2b',origin:'profissionais',business,goal
    };
    const event={
      event_type:'b2b.lead',
      idempotency_key:'b2b:lead:'+(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(16).slice(2)),
      metadata
    };
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),950);
    try{
      const response=await fetch('/api/b2b-lead',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(event),
        credentials:'same-origin',
        keepalive:true,
        signal:controller.signal
      });
      const result=await response.json().catch(()=>({}));
      // A 200 response with ignored:true is NOT a stored business lead.
      return Boolean(response.ok&&result.ok&&!result.ignored);
    }catch{return false}
    finally{clearTimeout(timeout)}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const name=read('nome'),company=read('empresa'),contact=read('contacto');
    const business=read('business'),goal=read('goal'),message=read('mensagem');
    if(!allowedBusiness.has(business)||!allowedGoal.has(goal)){
      status.textContent='Seleciona o teu tipo de negócio e o objetivo.';
      return;
    }
    const label=(selectName)=>form.elements[selectName].selectedOptions[0].textContent.trim();
    const text=[
      'Olá, João. Quero falar com a MAISON JF® sobre uma proposta profissional.',
      'Nome: '+name,'Empresa: '+company,
      'Contacto: '+contact,
      'Negócio: '+label('business'),
      'Objetivo: '+label('goal'),
      'Pedido: '+message
    ].join('\n');
    button.disabled=true;
    status.textContent='A preparar a conversa no WhatsApp…';
    // PII is sent ONLY through the visitor's chosen WhatsApp action.
    // The telemetry endpoint receives validated non-identifying categories.
    await signalNonPersonalContext(business,goal);
    const href='https://wa.me/351923318289?text='+encodeURIComponent(text);
    status.textContent='O WhatsApp vai abrir. Confirma o envio da mensagem para concluir o pedido.';
    window.location.assign(href);
    button.disabled=false;
  });
  const email=document.getElementById('maison-b2b-email');
  if(email)email.addEventListener('click',()=>{
    const name=read('nome'),company=read('empresa'),business=read('business'),goal=read('goal'),message=read('mensagem');
    const subject='MAISON JF® | Proposta profissional | '+company.slice(0,60);
    const body=[
      'Nome: '+name,'Empresa: '+company,'Contacto: '+read('contacto'),
      'Negócio: '+business,'Objetivo: '+goal,'Pedido: '+message
    ].join('\n');
    email.href='mailto:maisonjf@proton.me?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  });
})();

/* MAISON JF® — direct, confirmed B2B application.
   Name, company, email and message are sent ONLY to the dedicated B2B application
   branch of /api/b2b-lead. Never label a telemetry-only 200 as "lead stored". */
(function(){
 'use strict';
 const form=document.getElementById('maison-b2b-request');
 if(!form)return;
 const status=document.getElementById('maison-b2b-status');
 const button=form.querySelector('button[type="submit"]');
 const allowedBusiness=new Set(['loja','spa','terapeuta','alojamento','servico','organizacao','outro']);
 const allowedGoal=new Set(['ticket','recompra','diferenciar','continuar','boasvindas','testar','presentear','equipa','formacao']);
 const read=key=>String(new FormData(form).get(key)||'').trim();
 let pendingId=null;
 form.addEventListener('input',()=>{pendingId=null});
 function feedback(text,ok){
   status.textContent=text;
   status.dataset.state=ok?'success':'error';
 }
 form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!form.reportValidity())return;
   const activity=read('business'),goal=read('goal');
   if(!allowedBusiness.has(activity)||!allowedGoal.has(goal)){
     feedback('Seleciona o tipo de negócio e o objetivo.',false);return;
   }
   const data={
     name:read('nome'),company:read('empresa'),email:read('contacto'),
     activity,goal,message:read('mensagem'),
     consent:form.elements.consentimento.checked,
     website:read('website')
   };
   if(!data.consent){feedback('Confirma o consentimento.',false);return}
   if(!globalThis.crypto?.randomUUID){feedback('Atualiza o navegador para enviar o pedido com segurança.',false);return}
   const idempotency=pendingId||(pendingId='b2b:application:'+crypto.randomUUID());
   button.disabled=true;
   feedback('A registar o pedido…',false);
   try{
     const response=await fetch('/api/b2b-lead',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({type:'b2b_application',idempotency_key:idempotency,data})
     });
     const result=await response.json().catch(()=>({}));
     if(!response.ok||result.ok!==true||result.stored!==true||!result.reference){
       throw new Error(result.error||'Não foi possível confirmar o registo.');
     }
     feedback('Candidatura guardada com sucesso. Entraremos em contacto pelo email indicado.',true);
     pendingId=null;
     form.reset();
   }catch(error){
     feedback(error.message||'Não foi possível guardar o pedido. Podes contactar-nos por email.',false);
   }finally{button.disabled=false}
 });
})();
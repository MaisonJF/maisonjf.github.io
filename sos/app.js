const $=id=>document.getElementById(id);
const offline=$('offlineView'),app=$('appView'),setup=$('setupView'),statusView=$('statusView'),message=$('message');
let accessToken='';

function say(text){message.textContent=text||''}
function idempotency(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)}
async function api(path,{method='GET',body,idempotent=false}={}){
  const headers={'Authorization':'Bearer '+accessToken};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(idempotent)headers['Idempotency-Key']=idempotency();
  const response=await fetch('/api/sos/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
  const data=await response.json().catch(()=>({ok:false,error:'invalid_response'}));
  if(!response.ok)throw Object.assign(new Error(data.error||'request_failed'),{status:response.status});
  return data;
}
function showSetup(){setup.hidden=false;statusView.hidden=true}
function showStatus(data){
  if(data.configured===false){showSetup();return}
  setup.hidden=true;statusView.hidden=false;
  const state=String(data.state||data.status||'safe');
  const labels={setup:'Aguardamos o contacto',active:'Tudo certo',safe:'Tudo certo',due:'Está na hora',grace:'Atrasado',contact_due:'Aviso devido',paused:'Pausado'};
  $('stateLabel').textContent=labels[state]||'Tudo certo';
  $('checkinButton').disabled=state==='paused'||state==='setup';
  $('pauseButton').hidden=state==='paused'||state==='setup';
  $('resumeButton').hidden=state!=='paused';
  $('nextDue').textContent=data.nextDueAt?'Próximo check-in: '+new Date(data.nextDueAt).toLocaleString('pt-PT'):state==='setup'?'O contacto de confiança ainda precisa de aceitar o convite.':'';
}
async function refresh(){showStatus(await api('status'))}
async function boot(){
  // A sessão Supabase será ligada aqui no ambiente fechado. Até lá, esta superfície é deliberadamente inerte.
  offline.hidden=false;app.hidden=true;
}
$('setupView').addEventListener('submit',async event=>{
  event.preventDefault();say('A enviar convite…');
  try{
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    await api('setup',{method:'POST',body:{timezone,checkinLocalTime:$('checkinTime').value,trustedContactEmail:$('contactEmail').value}});
    say('Convite enviado. O contacto precisa de aceitar antes da activação.');await refresh();
  }catch{say('Não foi possível concluir agora. Tenta novamente mais tarde.')}
});
$('checkinButton').addEventListener('click',async()=>{say('A confirmar…');try{await api('checkin',{method:'POST',idempotent:true});await refresh();say('Confirmado. ❤️')}catch{say('Não foi possível confirmar agora.')}});
$('pauseButton').addEventListener('click',async()=>{try{await api('pause',{method:'POST'});await refresh();say('SOS pausado.')}catch{say('Não foi possível pausar agora.')}});
$('resumeButton').addEventListener('click',async()=>{try{await api('resume',{method:'POST'});await refresh();say('SOS retomado.')}catch{say('Não foi possível retomar agora.')}});
$('deleteButton').addEventListener('click',async()=>{if(!confirm('Eliminar definitivamente os dados operacionais do teu SOS?'))return;try{await api('delete',{method:'POST',body:{confirm:'DELETE_SOS'}});say('SOS eliminado.');showSetup()}catch{say('Não foi possível eliminar agora.')}});
boot();
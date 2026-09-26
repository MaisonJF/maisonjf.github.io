const $=id=>document.getElementById(id);
const offline=$('offlineView'),authView=$('authView'),app=$('appView'),setup=$('setupView'),statusView=$('statusView'),message=$('message'),authMessage=$('authMessage');
let accessToken='',authConfig=null;

function say(text){message.textContent=text||''}
function authSay(text){authMessage.textContent=text||''}
function idempotency(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)}
function showOnly(view){offline.hidden=view!==offline;authView.hidden=view!==authView;app.hidden=view!==app}
async function publicConfig(){
  const response=await fetch('/api/sos/config',{headers:{accept:'application/json'},credentials:'same-origin'});
  if(!response.ok)return null;
  return response.json().catch(()=>null);
}
async function supabase(path,{method='GET',body,token}={}){
  const headers={'apikey':authConfig.supabasePublishableKey};
  if(token)headers.Authorization='Bearer '+token;
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(authConfig.supabaseUrl+'/auth/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.msg||data.error_description||data.error||'auth_failed'),{status:response.status});
  return data;
}
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
async function consumeSessionFromUrl(){
  const hash=new URLSearchParams(location.hash.slice(1));
  let token=hash.get('access_token')||'';
  let expires=Number(hash.get('expires_in')||0);
  const query=new URLSearchParams(location.search);
  const code=query.get('code')||'';
  if(!token&&code){
    const data=await supabase('token?grant_type=pkce',{method:'POST',body:{auth_code:code,code_verifier:sessionStorage.getItem('sos_pkce_verifier')||''}});
    token=String(data.access_token||'');expires=Number(data.expires_in||0);
  }
  if(!token)return false;
  accessToken=token;
  sessionStorage.setItem('sos_access_token',token);
  if(expires)sessionStorage.setItem('sos_access_expires_at',String(Date.now()+expires*1000));
  sessionStorage.removeItem('sos_pkce_verifier');
  history.replaceState(null,'',location.pathname);
  return true;
}
function restoreSession(){
  const token=sessionStorage.getItem('sos_access_token')||'';
  const expiry=Number(sessionStorage.getItem('sos_access_expires_at')||0);
  if(!token||(expiry&&Date.now()>=expiry)){sessionStorage.removeItem('sos_access_token');sessionStorage.removeItem('sos_access_expires_at');return false}
  accessToken=token;return true;
}
async function boot(){
  authConfig=await publicConfig();
  if(!authConfig?.available){showOnly(offline);return}
  await consumeSessionFromUrl();
  if(!accessToken)restoreSession();
  if(!accessToken){showOnly(authView);return}
  showOnly(app);
  try{await refresh()}catch(error){
    if(error.status===401){sessionStorage.clear();accessToken='';showOnly(authView);authSay('A sessão terminou. Envia um novo link.')}
    else{say('O SOS está temporariamente indisponível.')}
  }
}
$('authForm').addEventListener('submit',async event=>{
  event.preventDefault();authSay('A enviar o link seguro…');
  try{
    const email=$('authEmail').value.trim().toLowerCase();
    await supabase('otp',{method:'POST',body:{email,create_user:true,gotrue_meta_security:{captcha_token:''},options:{email_redirect_to:location.origin+'/sos/'}}});
    authSay('Enviámos o link. Abre o email neste dispositivo para continuar.');
  }catch{authSay('Não foi possível enviar o link agora. Tenta novamente mais tarde.')}
});
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
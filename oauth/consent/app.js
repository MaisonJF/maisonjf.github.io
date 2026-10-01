import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_EMAIL_SHA256='0f63626f4bb200dcea81d29de36dd74809ead3260de742f69c41465085815dd8';
const $=id=>document.getElementById(id);
const status=$('status'),loginBox=$('loginBox'),consentBox=$('consentBox');
const authorizationId=new URL(location.href).searchParams.get('authorization_id')||'';

function say(text){status.textContent=text||''}
function show(el){el.classList.remove('hidden')}
function hide(el){el.classList.add('hidden')}
async function sha256(value){
  const bytes=new TextEncoder().encode(String(value).trim().toLowerCase());
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function boot(){
  if(!authorizationId){say('Pedido de autorização inválido ou expirado.');return}
  const config=await fetch('/api/sos/config',{headers:{accept:'application/json'},credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(!config?.available){say('A autenticação MAISON está temporariamente indisponível.');return}
  const supabase=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){show(loginBox);bindLogin(supabase);return}
  await showConsent(supabase);
}

function bindLogin(supabase){
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();say('A enviar o link seguro…');
    const email=$('email').value.trim().toLowerCase();
    if((await sha256(email))!==ALLOWED_EMAIL_SHA256){say('Esta conta não está autorizada para o MCP da MAISON.');return}
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href,shouldCreateUser:true}});
    if(error){say('Não foi possível enviar o link agora.');return}
    say('Link enviado. Abre o email neste dispositivo e volta a esta página.');
  });
}

async function showConsent(supabase){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user?.email||(await sha256(user.email))!==ALLOWED_EMAIL_SHA256){
    await supabase.auth.signOut();
    show(loginBox);bindLogin(supabase);say('A sessão atual não pertence à conta autorizada.');return;
  }
  const {data,error}=await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if(error||!data){say('O pedido de autorização expirou ou deixou de ser válido.');return}
  if(!('authorization_id' in data)){
    if(data.redirect_url)location.assign(data.redirect_url);
    return;
  }
  const client=data.client?.name||data.client_name||data.client?.client_name||'ChatGPT';
  const scope=String(data.scope||'').trim();
  $('clientName').textContent=client;
  $('scopeText').textContent=scope?'Permissões pedidas: '+scope.split(/\s+/).join(' · '):'Permissão para usar as ferramentas editoriais privadas.';
  hide(loginBox);show(consentBox);say('');

  $('approve').onclick=async()=>{
    say('A autorizar…');
    const result=await supabase.auth.oauth.approveAuthorization(authorizationId);
    if(result.error||!result.data?.redirect_url){say('Não foi possível concluir a autorização.');return}
    location.assign(result.data.redirect_url);
  };
  $('deny').onclick=async()=>{
    say('A recusar…');
    const result=await supabase.auth.oauth.denyAuthorization(authorizationId);
    if(result.error||!result.data?.redirect_url){say('Não foi possível concluir o pedido.');return}
    location.assign(result.data.redirect_url);
  };
}

boot().catch(()=>say('A ligação não pôde ser iniciada agora.'));

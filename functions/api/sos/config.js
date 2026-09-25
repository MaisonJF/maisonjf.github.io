import { jsonSos,withSosApi,methodNotAllowed } from '../../_lib/sos-api.js';

function enabled(value){return String(value||'').toLowerCase()==='true'}

export async function onRequestGet({env}){
  return withSosApi(async ()=>{
    const url=String(env?.MAISON_SOS_SUPABASE_URL||'').trim();
    const key=String(env?.MAISON_SOS_SUPABASE_PUBLISHABLE_KEY||'').trim();
    let origin='';
    try{
      const parsed=new URL(url);
      if(parsed.protocol==='https:')origin=parsed.origin;
    }catch{}
    const authEnabled=enabled(env?.MAISON_SOS_AUTH_ENABLED);
    const apiEnabled=enabled(env?.MAISON_SOS_API_ENABLED);
    return jsonSos({
      ok:true,
      available:Boolean(authEnabled&&apiEnabled&&origin&&key.length>=20),
      authEnabled,
      apiEnabled,
      supabaseUrl:authEnabled?origin:'',
      supabasePublishableKey:authEnabled?key:''
    });
  });
}
export async function onRequestPost(){return methodNotAllowed()}

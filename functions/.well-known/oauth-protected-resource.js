const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'authorization,content-type'};

function config(env){
  const url=String(env?.MAISON_SOS_SUPABASE_URL||'').trim().replace(/\/+$/,'');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw new Error('mcp_auth_not_configured');
  return url;
}

export async function onRequest(context){
  if(context.request.method==='OPTIONS') return new Response(null,{status:204,headers:JSON_HEADERS});
  if(context.request.method!=='GET') return new Response('Method Not Allowed',{status:405,headers:{...JSON_HEADERS,Allow:'GET, OPTIONS'}});
  try{
    const origin=new URL(context.request.url).origin;
    const auth=config(context.env);
    return new Response(JSON.stringify({
      resource:origin+'/mcp',
      authorization_servers:[auth+'/auth/v1'],
      scopes_supported:['openid','email','profile'],
      bearer_methods_supported:['header'],
      resource_documentation:origin+'/'
    }),{headers:JSON_HEADERS});
  }catch{
    return new Response(JSON.stringify({error:'mcp_auth_not_configured'}),{status:503,headers:JSON_HEADERS});
  }
}

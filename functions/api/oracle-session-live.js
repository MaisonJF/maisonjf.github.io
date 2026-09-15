export async function onRequestGet({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) return json({ error:'O checkout está temporariamente indisponível.' },503);
    const url=new URL(request.url),sessionId=String(url.searchParams.get('session_id')||'');
    if(!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)) return json({error:'Sessão inválida.'},400);
    const response=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId),{headers:{Authorization:'Bearer '+env.STRIPE_LIVE_SECRET_KEY}});
    const session=await response.json().catch(()=>({}));
    if(!response.ok) return json({error:'Não foi possível confirmar esta sessão.'},response.status);
    const valid=session.livemode===true&&session.payment_status==='paid'&&session.metadata?.environment==='maison-jf-live'&&session.metadata?.source==='oracle-live'&&session.metadata?.oracle_theme==='amor'&&session.metadata?.oracle_access==='single-reading'&&session.amount_total===200&&session.currency==='eur';
    if(!valid) return json({error:'Esta sessão não dá acesso a esta abertura.'},403);
    return json({paid:true,theme:'amor',session_id:session.id});
  } catch { return json({error:'Não foi possível verificar o pagamento.'},500); }
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
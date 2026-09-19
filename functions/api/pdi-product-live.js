const PRODUCTS={
  relacoes:{name:'PÁRA DE IGNORAR! · Relações',currency:'EUR',amount:599}
};

export async function onRequestGet({ request, env }) {
  const url=new URL(request.url);
  const theme=String(url.searchParams.get('theme')||'relacoes');
  const product=PRODUCTS[theme];
  if(!product)return json({available:false},404);

  const amount=product.amount;
  const available=true;

  return json({
    theme,
    name:product.name,
    currency:product.currency,
    available,
    amount_cents:available?amount:null,
    display_price:available?formatEUR(amount):null
  });
}

function formatEUR(cents){
  return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(cents/100);
}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}

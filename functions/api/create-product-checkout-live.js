const PRODUCTS={
  'vela-vidro':{name:'Vela Aromática MAISON JF® 170 g',price:'price_1UEoZT5H3wYRPmPV4hXuKvbZ'},
  'vela-pequena':{name:'Vela Aromática MAISON JF® 70 g',price:'price_1UHlIA5H3wYRPmPV3sMw6cZU'},
  'oleo-massagem':{name:'Óleo de Massagem MAISON JF® 60 ml',price:'price_1UEoZd5H3wYRPmPVVyUiS0MX'},
  'nevoa':{name:'Névoa de Ambiente MAISON JF® 20 ml',price:'price_1UEoZh5H3wYRPmPVSNTmhHzv'},
  'escalda-pes':{name:'Escalda-Pés MAISON JF® 150 g',price:'price_1UHlHp5H3wYRPmPVWJX7cZGi'}
};

const ALLOWED_COUNTRIES=[
  'PT','ES','FR','BE','NL','LU','DE','IT','IE','AT','DK','SE','FI','PL','CZ','SK','SI','HR','GR','HU','RO','BG','EE','LV','LT','CY','MT',
  'AD','AL','AM','AO','AR','AU','AZ','BA','BR','CA','CH','CL','CN','CO','CR','EC','EG','GE','GB','HK','ID','IL','IN','IS','JP','JO','KZ','KR','LI','MA',
  'MC','MD','ME','MX','MK','MY','NO','NZ','PA','PE','PH','QA','RS','SG','TH','TN','TR','TW','UA','AE','US','UY','VN','ZA'
];

const SHIPPING=[
  {name:'Portugal Continental',amount:590,min:2,max:4},
  {name:'Açores e Madeira',amount:1190,min:4,max:15},
  {name:'União Europeia',amount:1790,min:4,max:10},
  {name:'Resto do mundo',amount:2990,min:7,max:20}
];

export async function onRequestPost({request,env}){
  try{
    const origin=new URL(request.url).origin;
    const originHeader=request.headers.get('Origin');
    if(originHeader && new URL(originHeader).origin!==origin)return json({error:'Origem inválida.'},403);
    if(!env?.STRIPE_LIVE_SECRET_KEY)return json({error:'Checkout temporariamente indisponível.'},503);

    const body=await request.json().catch(()=>null);
    const slug=String(body?.slug||'');
    const product=PRODUCTS[slug];
    if(!product)return json({error:'Produto inválido.'},400);

    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',origin+'/checkout-produto-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url',origin+'/produtos/'+encodeURIComponent(slug)+'/');
    params.set('customer_creation','always');
    params.set('billing_address_collection','auto');
    params.set('phone_number_collection[enabled]','true');
    params.set('locale','pt');
    params.set('submit_type','pay');
    params.set('metadata[environment]','maison-jf-live');
    params.set('metadata[source]','physical-product-live');
    params.set('metadata[product_slug]',slug);
    params.set('metadata[has_physical]','1');

    params.set('custom_fields[0][key]','nif');
    params.set('custom_fields[0][label][type]','custom');
    params.set('custom_fields[0][label][custom]','NIF (opcional, para faturação)');
    params.set('custom_fields[0][type]','numeric');
    params.set('custom_fields[0][optional]','true');
    params.set('custom_fields[0][numeric][minimum_length]','9');
    params.set('custom_fields[0][numeric][maximum_length]','9');

    params.set('custom_text[submit][message]','Confirma que escolheste a zona de envio correspondente à tua morada. Ao pagar, aceitas as condições, envios e devoluções da MAISON JF®.');

    ALLOWED_COUNTRIES.forEach((country,i)=>{
      params.set('shipping_address_collection[allowed_countries]['+i+']',country);
    });

    SHIPPING.forEach((rate,i)=>{
      params.set('shipping_options['+i+'][shipping_rate_data][type]','fixed_amount');
      params.set('shipping_options['+i+'][shipping_rate_data][fixed_amount][amount]',String(rate.amount));
      params.set('shipping_options['+i+'][shipping_rate_data][fixed_amount][currency]','eur');
      params.set('shipping_options['+i+'][shipping_rate_data][display_name]','Envio rastreável · '+rate.name);
      params.set('shipping_options['+i+'][shipping_rate_data][delivery_estimate][minimum][unit]','business_day');
      params.set('shipping_options['+i+'][shipping_rate_data][delivery_estimate][minimum][value]',String(rate.min));
      params.set('shipping_options['+i+'][shipping_rate_data][delivery_estimate][maximum][unit]','business_day');
      params.set('shipping_options['+i+'][shipping_rate_data][delivery_estimate][maximum][value]',String(rate.max));
    });

    params.set('line_items[0][price]',product.price);
    params.set('line_items[0][quantity]','1');

    const stripeResponse=await fetch('https://api.stripe.com/v1/checkout/sessions',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+env.STRIPE_LIVE_SECRET_KEY,
        'content-type':'application/x-www-form-urlencoded'
      },
      body:params.toString()
    });
    const session=await stripeResponse.json().catch(()=>({}));
    if(!stripeResponse.ok||!session?.url){
      return json({error:session?.error?.message||'Não foi possível abrir o checkout.'},stripeResponse.status||502);
    }
    return json({url:session.url});
  }catch{
    return json({error:'Não foi possível preparar o checkout.'},500);
  }
}
export async function onRequestGet(){return json({error:'Método não permitido.'},405)}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }});
}

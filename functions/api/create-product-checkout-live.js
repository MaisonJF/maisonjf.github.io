const PRODUCTS={
  'vela-vidro':{name:'Vela Aromática MAISON JF® 170 g',price:'price_1UEoZT5H3wYRPmPV4hXuKvbZ',unitCents:1400,max:10},
  'vela-pequena':{name:'Vela Aromática MAISON JF® 70 g',price:'price_1UHlIA5H3wYRPmPV3sMw6cZU',unitCents:800,max:10},
  'oleo-massagem':{name:'Óleo de Massagem MAISON JF® 60 ml',price:'price_1UEoZd5H3wYRPmPVVyUiS0MX',unitCents:1200,max:10},
  'nevoa':{name:'Névoa de Ambiente MAISON JF® 20 ml',price:'price_1UHlo65H3wYRPmPVQsQBBDOU',unitCents:700,max:10},
  'escalda-pes':{name:'Escalda-Pés MAISON JF® 150 g',price:'price_1UHlHp5H3wYRPmPVWJX7cZGi',unitCents:500,max:10}
};

const EU_COUNTRIES=['ES','FR','BE','NL','LU','DE','IT','IE','AT','DK','SE','FI','PL','CZ','SK','SI','HR','GR','HU','RO','BG','EE','LV','LT','CY','MT'];
const WORLD_COUNTRIES=[
  'AD','AL','AM','AO','AR','AU','AZ','BA','BR','CA','CH','CL','CN','CO','CR','EC','EG','GE','GB','HK','ID','IL','IN','IS','JP','JO','KZ','KR','LI','MA',
  'MC','MD','ME','MX','MK','MY','NO','NZ','PA','PE','PH','QA','RS','SG','TH','TN','TR','TW','UA','AE','US','UY','VN','ZA'
];

const SHIPPING={
  mainland:{name:'Portugal Continental',amount:590,threshold:4900,min:2,max:4,countries:['PT']},
  islands:{name:'Açores e Madeira',amount:1190,threshold:7900,min:4,max:15,countries:['PT']},
  eu:{name:'União Europeia',amount:1790,threshold:9900,min:4,max:10,countries:EU_COUNTRIES},
  world:{name:'Resto do mundo',amount:2990,threshold:14900,min:7,max:20,countries:WORLD_COUNTRIES}
};

export async function onRequestPost({request,env}){
  try{
    const origin=new URL(request.url).origin;
    const originHeader=request.headers.get('Origin');
    if(originHeader && new URL(originHeader).origin!==origin)return json({error:'Origem inválida.'},403);
    if(!env?.STRIPE_LIVE_SECRET_KEY)return json({error:'Checkout temporariamente indisponível.'},503);

    const body=await request.json().catch(()=>null);
    const items=normaliseItems(body);
    if(!items.length)return json({error:'O carrinho está vazio ou contém dados inválidos.'},400);

    const zoneKey=String(body?.shipping_zone||'');
    const shipping=SHIPPING[zoneKey];
    if(!shipping)return json({error:'Escolhe a zona de envio antes de pagar.'},400);

    const subtotalCents=items.reduce((sum,item)=>sum+PRODUCTS[item.slug].unitCents*item.quantity,0);
    const shippingCents=subtotalCents>=shipping.threshold?0:shipping.amount;
    const freeShipping=shippingCents===0;

    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',origin+'/checkout-produto-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url',origin+'/produtos/carrinho/?checkout_cancelado=1');
    params.set('customer_creation','always');
    params.set('billing_address_collection','auto');
    params.set('phone_number_collection[enabled]','true');
    params.set('locale','pt');
    params.set('submit_type','pay');
    params.set('metadata[environment]','maison-jf-live');
    params.set('metadata[source]','physical-product-live');
    params.set('metadata[has_physical]','1');
    params.set('metadata[product_items]',items.map(item=>item.slug+':'+item.quantity).join(','));
    if(items.length===1)params.set('metadata[product_slug]',items[0].slug);
    params.set('metadata[shipping_zone]',zoneKey);
    params.set('metadata[shipping_zone_label]',shipping.name);
    params.set('metadata[shipping_cents]',String(shippingCents));
    params.set('metadata[shipping_free_threshold_cents]',String(shipping.threshold));

    params.set('custom_fields[0][key]','nif');
    params.set('custom_fields[0][label][type]','custom');
    params.set('custom_fields[0][label][custom]','NIF (opcional, para faturação)');
    params.set('custom_fields[0][type]','numeric');
    params.set('custom_fields[0][optional]','true');
    params.set('custom_fields[0][numeric][minimum_length]','9');
    params.set('custom_fields[0][numeric][maximum_length]','9');

    params.set('custom_text[submit][message]','Confirma que a zona de envio escolhida corresponde à tua morada. Ao pagar, aceitas as condições, envios e devoluções da MAISON JF®.');

    shipping.countries.forEach((country,i)=>{
      params.set('shipping_address_collection[allowed_countries]['+i+']',country);
    });

    params.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(shippingCents));
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','eur');
    params.set('shipping_options[0][shipping_rate_data][display_name]','Envio rastreável · '+shipping.name+(freeShipping?' · grátis':''));
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]','business_day');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]',String(shipping.min));
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]','business_day');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]',String(shipping.max));

    items.forEach((item,i)=>{
      const product=PRODUCTS[item.slug];
      params.set('line_items['+i+'][price]',product.price);
      params.set('line_items['+i+'][quantity]',String(item.quantity));
    });

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
    return json({
      url:session.url,
      subtotal_cents:subtotalCents,
      shipping_cents:shippingCents,
      free_shipping:freeShipping,
      free_threshold_cents:shipping.threshold
    });
  }catch{
    return json({error:'Não foi possível preparar o checkout.'},500);
  }
}
export async function onRequestGet(){return json({error:'Método não permitido.'},405)}

function normaliseItems(body){
  const requested=Array.isArray(body?.items)?body.items.slice(0,20):[];
  if(!requested.length && body?.slug)requested.push({slug:String(body.slug),quantity:1});
  const quantities=new Map();
  for(const raw of requested){
    const slug=String(raw?.slug||raw?.id||'');
    const product=PRODUCTS[slug];
    const quantity=Number(raw?.quantity);
    if(!product||!Number.isInteger(quantity)||quantity<1)continue;
    quantities.set(slug,Math.min(product.max,(quantities.get(slug)||0)+quantity));
  }
  return [...quantities.entries()].map(([slug,quantity])=>({slug,quantity}));
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }});
}

const RECOMMENDATION_FIELDS={
  recommendation_source:'rec_source',
  recommendation_offer:'rec_offer',
  recommendation_result:'rec_result',
  recommendation_route:'rec_route',
  recommendation_brain:'rec_brain'
};

const ACQUISITION_FIELDS={
  acquisition_referrer:'acq_referrer',
  acquisition_landing:'acq_landing',
  acquisition_utm_source:'utm_source',
  acquisition_utm_medium:'utm_medium',
  acquisition_utm_campaign:'utm_campaign'
};

const TOKEN=/^[A-Za-z0-9._:/+-]{1,180}$/;
const EMAIL=/(?:^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:$|[^A-Za-z0-9._%+-])/;
const IBAN=/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;
const CARD=/\b(?:\d[ -]?){13,19}\b/;

function directPii(value){
  const text=String(value||'');
  return EMAIL.test(text)||IBAN.test(text)||CARD.test(text);
}

function recommendationToken(value){
  const text=String(value||'').trim().slice(0,180);
  return text&&!directPii(text)&&TOKEN.test(text)?text:'';
}

function acquisitionText(value,max=200){
  const text=String(value||'').trim().replace(/[\r\n\t]+/g,' ').slice(0,max);
  return text&&!directPii(text)?text:'';
}

export function recommendationFromReferer(referer,expectedOrigin){
  if(!referer)return {};
  try{
    const url=new URL(referer);
    if(expectedOrigin&&url.origin!==expectedOrigin)return {};
    const q=url.searchParams;
    if(q.get('mj_source')!=='vpc')return {};
    return {
      recommendation_source:'vpc',
      recommendation_offer:recommendationToken(q.get('mj_offer')),
      recommendation_result:recommendationToken(q.get('mj_result')),
      recommendation_route:recommendationToken(q.get('mj_route')),
      recommendation_brain:recommendationToken(q.get('mj_brain'))
    };
  }catch{
    return {};
  }
}

export function normalizeCheckoutAttribution(raw={},referer='',expectedOrigin=''){
  const input=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const refererRecommendation=recommendationFromReferer(referer,expectedOrigin);
  const out={};

  for(const key of Object.keys(RECOMMENDATION_FIELDS)){
    const value=recommendationToken(input[key])||refererRecommendation[key]||'';
    if(value)out[key]=value;
  }

  const acquisitionLimits={
    acquisition_referrer:160,
    acquisition_landing:220,
    acquisition_utm_source:120,
    acquisition_utm_medium:120,
    acquisition_utm_campaign:180
  };
  for(const key of Object.keys(ACQUISITION_FIELDS)){
    const value=acquisitionText(input[key],acquisitionLimits[key]);
    if(value)out[key]=value;
  }
  return out;
}

export function appendCheckoutAttribution(params,raw={},referer='',expectedOrigin=''){
  const normalized=normalizeCheckoutAttribution(raw,referer,expectedOrigin);
  for(const [input,key] of Object.entries({...RECOMMENDATION_FIELDS,...ACQUISITION_FIELDS})){
    const value=normalized[input];
    if(value)params.set('metadata['+key+']',value);
  }
  return normalized;
}

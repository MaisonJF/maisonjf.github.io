const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const count=value=>{
  const number=Number(value||0);
  return Number.isFinite(number)&&number>0?Math.floor(number):0;
};

/**
 * Derive a small, bounded recommendation adjustment from anonymized aggregate
 * site interactions and confirmed paid conversions. This never writes learning
 * records and never uses test answers, names, emails, or other direct identity.
 */
export function deriveOfferTelemetryLearning({
  interactionRows=[],
  purchaseRows=[],
  existing={},
  route=''
}={}){
  const metrics=new Map();
  const activeRoute=String(route||'');
  const bucket=(offerId,rowRoute='')=>{
    const id=String(offerId||'').trim().slice(0,120);
    const routeValue=String(rowRoute||'').trim().slice(0,120);
    if(!id)return null;
    if(activeRoute&&routeValue&&routeValue!==activeRoute)return null;
    let row=metrics.get(id);
    if(!row){
      row={exposures:0,clicks:0,purchases:0};
      metrics.set(id,row);
    }
    return row;
  };

  for(const row of interactionRows){
    const metric=bucket(row?.offer_id,row?.route);
    if(!metric)continue;
    const total=count(row?.count);
    if(row?.event_type==='offer.exposure')metric.exposures+=total;
    if(row?.event_type==='offer.click')metric.clicks+=total;
  }
  for(const row of purchaseRows){
    const metric=bucket(row?.offer_id,row?.route);
    if(metric)metric.purchases+=count(row?.count);
  }

  const rates=[...metrics.values()]
    .filter(item=>item.exposures>=20)
    .map(item=>item.clicks/item.exposures)
    .sort((a,b)=>a-b);
  const median=rates.length
    ? rates.length%2
      ? rates[Math.floor(rates.length/2)]
      : (rates[rates.length/2-1]+rates[rates.length/2])/2
    : null;

  const out={...(existing||{})};
  for(const [offerId,metric] of metrics){
    const prior=out[offerId]||{};
    const priorDelta=Number(prior.confidence_delta??prior.confidenceDelta??0);
    const priorCount=count(prior.observation_count??prior.observationCount);
    const observations=metric.clicks+metric.purchases;
    if(observations<3&&!priorCount)continue;

    let telemetryDelta=0;
    // CTR only acts after a meaningful exposure sample and at least three clicks.
    if(median!=null&&metric.exposures>=20&&metric.clicks>=3){
      telemetryDelta+=clamp(Math.round((metric.clicks/metric.exposures-median)*100),-8,8);
    }
    // Confirmed paid conversions carry more weight than clicks, but remain capped.
    if(metric.purchases>0&&metric.clicks>=3){
      telemetryDelta+=Math.min(2,metric.purchases)*4;
    }

    const base=Number.isFinite(priorDelta)?priorDelta:0;
    out[offerId]={
      confidence_delta:clamp(base+telemetryDelta,-20,15),
      observation_count:Math.max(priorCount,observations)
    };
  }
  return out;
}

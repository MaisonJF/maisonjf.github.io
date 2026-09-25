import fs from 'node:fs';

const API='https://api.cloudflare.com/client/v4';
const GRAPHQL=API+'/graphql';
const POLICY_PATH='.github/maison-growth/brain/crawler-policy.json';

function required(name){
  const value=String(process.env[name]||'').trim();
  if(!value)throw new Error('missing_'+name.toLowerCase());
  return value;
}
function iso(date){return date.toISOString().replace(/\.\d{3}Z$/,'Z')}
function daysAgo(days){return new Date(Date.now()-days*86400000)}

async function cfJson(url,options={}){
  const token=required('CLOUDFLARE_API_TOKEN');
  const response=await fetch(url,{
    ...options,
    headers:{
      'Authorization':'Bearer '+token,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!response.ok)throw new Error('cloudflare_http_'+response.status+':'+text.slice(0,500));
  return data;
}

export function crawlerIndex(policy){
  const byId=new Map();
  for(const bot of policy.search_discovery_required||[]){
    for(const id of bot.cloudflare_detection_ids||[]){
      if(byId.has(Number(id)))throw new Error('duplicate_detection_id:'+id);
      byId.set(Number(id),{
        user_agent:bot.user_agent,
        operator:bot.operator,
        purpose:bot.purpose
      });
    }
  }
  return byId;
}

export function summariseCrawlerGroups(policy,groups=[]){
  const byId=crawlerIndex(policy);
  const totals=new Map(
    (policy.search_discovery_required||[]).map(bot=>[
      bot.user_agent,
      {user_agent:bot.user_agent,operator:bot.operator,purpose:bot.purpose,requests:0,hosts:new Set()}
    ])
  );

  for(const group of groups){
    const ids=Array.isArray(group?.dimensions?.botDetectionIds)
      ? group.dimensions.botDetectionIds.map(Number)
      : [];
    const host=String(group?.dimensions?.clientRequestHTTPHost||'');
    const count=Number(group?.count||0);
    const matched=new Set();
    for(const id of ids){
      const bot=byId.get(id);
      if(bot)matched.add(bot.user_agent);
    }
    for(const agent of matched){
      const row=totals.get(agent);
      row.requests+=count;
      if(host)row.hosts.add(host);
    }
  }

  return [...totals.values()].map(row=>({
    user_agent:row.user_agent,
    operator:row.operator,
    purpose:row.purpose,
    requests:row.requests,
    observed:row.requests>0,
    hosts:[...row.hosts].sort()
  }));
}

export function summariseReferralGroups(groups=[]){
  const operators={
    OpenAI:new Set(['chatgpt.com','openai.com']),
    Anthropic:new Set(['claude.ai','anthropic.com']),
    Perplexity:new Set(['perplexity.ai'])
  };
  const totals=Object.fromEntries(Object.keys(operators).map(name=>[name,{operator:name,requests:0,hosts:new Set()}]));
  for(const group of groups){
    const host=String(group?.dimensions?.clientRefererHost||'').toLowerCase().replace(/^www\./,'');
    const count=Number(group?.count||0);
    for(const [operator,hosts] of Object.entries(operators)){
      if(hosts.has(host)){
        totals[operator].requests+=count;
        totals[operator].hosts.add(host);
      }
    }
  }
  return Object.values(totals).map(row=>({
    operator:row.operator,
    requests:row.requests,
    observed:row.requests>0,
    hosts:[...row.hosts].sort()
  }));
}

async function resolveZone(accountId){
  const url=new URL(API+'/zones');
  url.searchParams.set('name','maison-jf.com');
  url.searchParams.set('account.id',accountId);
  url.searchParams.set('status','active');
  url.searchParams.set('per_page','50');
  const data=await cfJson(url);
  const zones=Array.isArray(data.result)?data.result:[];
  const exact=zones.find(zone=>String(zone.name).toLowerCase()==='maison-jf.com');
  if(!exact?.id)throw new Error('maison_zone_not_visible_to_read_token');
  return String(exact.id);
}

async function queryPresence(zoneId,policy,start,end){
  const ids=[...crawlerIndex(policy).keys()].sort((a,b)=>a-b);
  const query=`query CrawlerPresence($zoneTag: string, $start: Time, $end: Time) {
    viewer {
      zones(filter: {zoneTag: $zoneTag}) {
        groups: httpRequestsAdaptiveGroups(
          limit: 5000
          orderBy: [count_DESC]
          filter: {
            datetime_geq: $start
            datetime_leq: $end
            requestSource: "eyeball"
            botDetectionIds_hasany: [${ids.join(',')}]
          }
        ) {
          count
          dimensions {
            botDetectionIds
            clientRequestHTTPHost
          }
          avg {
            sampleInterval
          }
        }
      }
    }
  }`;
  const data=await cfJson(GRAPHQL,{
    method:'POST',
    body:JSON.stringify({query,variables:{zoneTag:zoneId,start,end}})
  });
  if(Array.isArray(data.errors)&&data.errors.length){
    throw new Error('cloudflare_graphql:'+JSON.stringify(data.errors).slice(0,1000));
  }
  return data?.data?.viewer?.zones?.[0]?.groups||[];
}

async function queryAiReferrals(zoneId,start,end){
  const query=`query AIReferrals($zoneTag: string, $start: Time, $end: Time) {
    viewer {
      zones(filter: {zoneTag: $zoneTag}) {
        groups: httpRequestsAdaptiveGroups(
          limit: 500
          orderBy: [count_DESC]
          filter: {
            datetime_geq: $start
            datetime_leq: $end
            requestSource: "eyeball"
            OR: [
              {clientRefererHost: "chatgpt.com"}
              {clientRefererHost: "openai.com"}
              {clientRefererHost: "claude.ai"}
              {clientRefererHost: "anthropic.com"}
              {clientRefererHost: "perplexity.ai"}
            ]
          }
        ) {
          count
          dimensions {
            clientRefererHost
          }
        }
      }
    }
  }`;
  const data=await cfJson(GRAPHQL,{
    method:'POST',
    body:JSON.stringify({query,variables:{zoneTag:zoneId,start,end}})
  });
  if(Array.isArray(data.errors)&&data.errors.length){
    throw new Error('cloudflare_referral_graphql:'+JSON.stringify(data.errors).slice(0,1000));
  }
  return data?.data?.viewer?.zones?.[0]?.groups||[];
}

export async function auditCrawlerPresence({output=null}={}){
  const policy=JSON.parse(fs.readFileSync(POLICY_PATH,'utf8'));
  const accountId=required('CLOUDFLARE_ACCOUNT_ID');
  const days=Number(policy?.cloudflare?.lookback_days||7);
  const start=iso(daysAgo(days));
  const end=iso(new Date());
  const base={
    schema_version:'maison_crawler_presence_v1',
    observed_at:end,
    window:{start,end,days},
    source:'cloudflare_graphql',
    verification:'cloudflare_bot_detection_ids',
    raw_request_data_persisted:false,
    pii_persisted:false,
    policy_version:policy.schema_version,
    observability:'unknown',
    crawlers:[]
  };

  try{
    const zoneId=await resolveZone(accountId);
    const groups=await queryPresence(zoneId,policy,start,end);
    let aiReferrals;
    try{
      const referralGroups=await queryAiReferrals(zoneId,start,end);
      aiReferrals={
        observability:'available',
        sources:summariseReferralGroups(referralGroups),
        total_requests:referralGroups.reduce((sum,row)=>sum+Number(row.count||0),0)
      };
    }catch(referralError){
      aiReferrals={
        observability:'unavailable',
        reason:String(referralError?.message||referralError).slice(0,1000),
        sources:[],
        note:'Referral host analytics may require a paid Cloudflare plan; no zero-referral claim is made.'
      };
    }
    const result={
      ...base,
      observability:'available',
      zone:'maison-jf.com',
      crawlers:summariseCrawlerGroups(policy,groups),
      total_verified_crawler_requests:groups.reduce((sum,row)=>sum+Number(row.count||0),0),
      ai_referrals:aiReferrals,
      note:'Counts may be sampled according to Cloudflare analytics plan/dataset behaviour.'
    };
    if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
    return result;
  }catch(error){
    const result={
      ...base,
      observability:'unavailable',
      reason:String(error?.message||error).slice(0,1000),
      note:'No crawler presence claim is made when Cloudflare analytics are not observable with the current plan or read token.'
    };
    if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
    return result;
  }
}

const isMain=process.argv[1]&&new URL('file://'+process.argv[1]).pathname===new URL(import.meta.url).pathname;
if(isMain){
  const outputArg=process.argv.find(arg=>arg.startsWith('--output='));
  const output=outputArg?outputArg.slice('--output='.length):null;
  const result=await auditCrawlerPresence({output});
  console.log(JSON.stringify(result,null,2));
}

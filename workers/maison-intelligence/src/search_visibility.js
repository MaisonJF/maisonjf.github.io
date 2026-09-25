const GSC_DOC='https://developers.google.com/webmaster-tools/v1/searchanalytics/query';
const GSC_TOKEN_URL='https://oauth2.googleapis.com/token';
const GSC_API_ROOT='https://www.googleapis.com/webmasters/v3/sites/';
const GSC_INSPECTION_URL='https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const BING_DOC='https://learn.microsoft.com/en-us/bingwebmaster/';
const BING_TOKEN_URL='https://www.bing.com/webmasters/oauth/token';
const BING_API_ROOT='https://www.bing.com/webmaster/api.svc/json/';

function enabled(value){return String(value??'').toLowerCase()==='true'}
function isoDay(date){return date.toISOString().slice(0,10)}
function pacificDay(date){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Los_Angeles',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return values.year+'-'+values.month+'-'+values.day;
}
function shiftDay(day,delta){
  const date=new Date(day+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+delta);
  return isoDay(date);
}
function daysBefore(date,days){return new Date(date.getTime()-days*86400000)}
function clampInt(value,fallback,min,max){
  const n=Number.parseInt(value,10);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,n));
}
function googleProperty(env){
  const value=String(env.GOOGLE_SEARCH_CONSOLE_PROPERTY||'').trim();
  if(!value)return '';
  if(!/^sc-domain:[a-z0-9.-]+$/i.test(value)&&!/^https?:\/\//i.test(value)){
    throw new Error('gsc_invalid_property');
  }
  return value;
}
function bingSite(env){
  const value=String(env.BING_WEBMASTER_SITE_URL||'').trim();
  if(!value)return '';
  let url;
  try{url=new URL(value)}catch{throw new Error('bing_invalid_site_url')}
  if(!/^https?:$/.test(url.protocol)||url.username||url.password)throw new Error('bing_invalid_site_url');
  url.hash='';url.search='';
  if(!url.pathname.endsWith('/'))url.pathname+='/';
  return url.href;
}

async function jsonFetch(url,options,timeoutMs=30000,errorPrefix='search_platform'){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal});
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
    if(!response.ok){
      const error=new Error(`${errorPrefix}_http_${response.status}`);
      error.status=response.status;
      error.body=text.slice(0,800);
      throw error;
    }
    return data;
  }finally{
    clearTimeout(timer);
  }
}

async function refreshAccessToken({tokenUrl,clientId,clientSecret,refreshToken,prefix}){
  if(!clientId||!clientSecret||!refreshToken)throw new Error(prefix+'_oauth_not_configured');
  const body=new URLSearchParams({
    client_id:String(clientId),
    client_secret:String(clientSecret),
    refresh_token:String(refreshToken),
    grant_type:'refresh_token'
  });
  const data=await jsonFetch(tokenUrl,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  },30000,prefix);
  if(!data.access_token)throw new Error(prefix+'_access_token_missing');
  return String(data.access_token);
}

const GOOGLE_PROFILES=Object.freeze([
  {key:'pages',dimensions:['page'],cadenceHours:24,rowLimit:40},
  {key:'queries',dimensions:['query'],cadenceHours:24,rowLimit:40},
  {key:'devices',dimensions:['device'],cadenceHours:168,rowLimit:10},
  {key:'countries',dimensions:['country'],cadenceHours:168,rowLimit:40},
  {key:'appearance',dimensions:['searchAppearance'],cadenceHours:168,rowLimit:20},
  {key:'fresh_pages',dimensions:['date','page'],cadenceHours:24,rowLimit:40,days:3,lagDays:0,dataState:'all'},
  {key:'image_pages',dimensions:['page'],cadenceHours:168,rowLimit:40,type:'image'},
  {key:'discover_pages',dimensions:['page'],cadenceHours:168,rowLimit:40,type:'discover'}
]);

export const DEFAULT_INSPECTION_URLS=Object.freeze([
  'https://maison-jf.com/',
  'https://maison-jf.com/servicos/tarot/',
  'https://maison-jf.com/produtos/oleo-massagem/',
  'https://maison-jf.com/profissionais/',
  'https://maison-jf.com/ebooks/virgulas-do-destino-o-turista/',
  'https://maison-jf.com/oraculo/ansiedade-antecipacao'
]);

function inspectionUrls(env){
  const raw=String(env.GOOGLE_SEARCH_CONSOLE_INSPECTION_URLS||'').trim();
  const items=(raw?raw.split(','):DEFAULT_INSPECTION_URLS).map(x=>String(x).trim()).filter(Boolean);
  const out=[];
  for(const item of items){
    let u;
    try{u=new URL(item)}catch{throw new Error('gsc_invalid_inspection_url')}
    if(u.protocol!=='https:'||u.hostname!=='maison-jf.com')throw new Error('gsc_invalid_inspection_url');
    u.hash='';u.search='';
    out.push(u.href);
  }
  return [...new Set(out)].slice(0,20);
}

const BING_PROFILES=Object.freeze([
  {key:'traffic',method:'GetRankAndTrafficStats',cadenceHours:24},
  {key:'pages',method:'GetPageStats',cadenceHours:168},
  {key:'queries',method:'GetQueryStats',cadenceHours:168}
]);

export function configuredSearchVisibilityTasks(env){
  if(!enabled(env.SEARCH_VISIBILITY_ENABLED))return [];
  const out=[];

  if(enabled(env.GOOGLE_SEARCH_CONSOLE_ENABLED)){
    const site=googleProperty(env);
    if(
      site&&
      env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID&&
      env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET&&
      env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
    ){
      const days=clampInt(env.GOOGLE_SEARCH_CONSOLE_WINDOW_DAYS,28,7,180);
      const lagDays=clampInt(env.GOOGLE_SEARCH_CONSOLE_LAG_DAYS,3,1,7);
      for(const profile of GOOGLE_PROFILES){
        out.push({
          family:'google_search_console',
          providerId:'google_search_console',
          territoryKey:'search_visibility',
          site,days,lagDays,...profile
        });
      }
      const inspect=inspectionUrls(env);
      if(inspect.length){
        out.push({
          family:'google_url_inspection',
          providerId:'google_search_console',
          territoryKey:'search_visibility',
          site,
          key:'inspection',
          cadenceHours:24,
          inspectionUrls:inspect
        });
      }
      out.push({
        family:'google_sitemaps',
        providerId:'google_search_console',
        territoryKey:'search_visibility',
        site,
        key:'sitemaps',
        cadenceHours:24
      });
    }
  }

  if(enabled(env.BING_WEBMASTER_ENABLED)){
    const site=bingSite(env);
    if(
      site&&
      env.BING_WEBMASTER_CLIENT_ID&&
      env.BING_WEBMASTER_CLIENT_SECRET&&
      env.BING_WEBMASTER_REFRESH_TOKEN
    ){
      for(const profile of BING_PROFILES){
        out.push({
          family:'bing_webmaster',
          providerId:'bing_webmaster',
          territoryKey:'search_visibility',
          site,...profile
        });
      }
    }
  }

  return out;
}

export function searchVisibilityDue(task,scheduledDate){
  const epochHour=Math.floor(scheduledDate.getTime()/3600000);
  return epochHour%task.cadenceHours===0;
}

export function searchVisibilityTaskIdentity(task){
  return JSON.stringify({
    family:task.family,key:task.key,site:task.site,days:task.days??null,
    lagDays:task.lagDays??null,type:task.type??'web',dataState:task.dataState??null,dimensions:task.dimensions??null,
    rowLimit:task.rowLimit??null,method:task.method??null,
    inspectionUrls:task.inspectionUrls??null
  });
}

async function fetchGoogle(env,task,scheduledDate){
  const token=await refreshAccessToken({
    tokenUrl:GSC_TOKEN_URL,
    clientId:env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    clientSecret:env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    refreshToken:env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
    prefix:'gsc'
  });
  const endDay=shiftDay(pacificDay(scheduledDate),-Number(task.lagDays||0));
  const startDay=shiftDay(endDay,-(Number(task.days||1)-1));
  const endpoint=GSC_API_ROOT+encodeURIComponent(task.site)+'/searchAnalytics/query';
  const data=await jsonFetch(endpoint,{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      startDate:startDay,
      endDate:endDay,
      dimensions:task.dimensions,
      type:task.type||'web',
      dataState:task.dataState||'final',
      rowLimit:task.rowLimit,
      startRow:0
    })
  },30000,'gsc');

  const rows=(data.rows||[]).slice(0,task.rowLimit).map(row=>({
    keys:Array.isArray(row.keys)?row.keys.map(value=>String(value).slice(0,1200)):[],
    clicks:Number(row.clicks||0),
    impressions:Number(row.impressions||0),
    ctr:Number(row.ctr||0),
    position:Number(row.position||0)
  }));

  return {
    providerId:'google_search_console',
    modelId:null,
    sourceClass:'search_platform',
    text:JSON.stringify({
      schema:'maison.search-visibility.gsc.v1',
      provider:'google_search_console',
      property:task.site,
      profile:task.key,
      dimensions:task.dimensions,
      search_type:task.type||'web',
      data_state:task.dataState||'final',
      start_date:startDay,
      end_date:endDay,
      first_incomplete_date:data?.metadata?.first_incomplete_date||null,
      first_incomplete_hour:data?.metadata?.first_incomplete_hour||null,
      retrieved_at:new Date().toISOString(),
      row_count:rows.length,
      rows
    }),
    citations:[],
    requestId:null,usage:null,
    groundingState:'direct_observation',
    confidenceClass:'high',
    strength:95,
    evidenceSource:'gsc',
    evidenceKind:'coverage',
    independentEvidenceRoots:0,
    sourceKind:'search_visibility'
  };
}

async function fetchGoogleInspection(env,task,scheduledDate){
  const token=await refreshAccessToken({
    tokenUrl:GSC_TOKEN_URL,
    clientId:env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    clientSecret:env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    refreshToken:env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
    prefix:'gsc'
  });
  const day=Math.floor(scheduledDate.getTime()/86400000);
  const inspectionUrl=task.inspectionUrls[((day%task.inspectionUrls.length)+task.inspectionUrls.length)%task.inspectionUrls.length];
  const data=await jsonFetch(GSC_INSPECTION_URL,{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      inspectionUrl,
      siteUrl:task.site,
      languageCode:'pt-PT'
    })
  },30000,'gsc_inspection');

  const status=data?.inspectionResult?.indexStatusResult||{};
  const snapshot={
    schema:'maison.search-visibility.gsc-inspection.v1',
    provider:'google_search_console',
    property:task.site,
    inspection_url:inspectionUrl,
    retrieved_at:new Date().toISOString(),
    verdict:String(status.verdict||''),
    coverage_state:String(status.coverageState||''),
    robots_txt_state:String(status.robotsTxtState||''),
    indexing_state:String(status.indexingState||''),
    last_crawl_time:String(status.lastCrawlTime||''),
    page_fetch_state:String(status.pageFetchState||''),
    google_canonical:String(status.googleCanonical||''),
    user_canonical:String(status.userCanonical||''),
    crawled_as:String(status.crawledAs||''),
    sitemaps:Array.isArray(status.sitemap)?status.sitemap.map(String).slice(0,10):[]
  };

  return {
    providerId:'google_search_console',
    modelId:null,
    sourceClass:'search_platform',
    text:JSON.stringify(snapshot),
    citations:[],
    requestId:null,usage:null,
    groundingState:'direct_observation',
    confidenceClass:'high',
    strength:100,
    evidenceSource:'gsc',
    evidenceKind:'coverage',
    independentEvidenceRoots:0,
    sourceKind:'search_visibility'
  };
}

async function fetchGoogleSitemaps(env,task){
  const token=await refreshAccessToken({
    tokenUrl:GSC_TOKEN_URL,
    clientId:env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    clientSecret:env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    refreshToken:env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
    prefix:'gsc'
  });
  const endpoint=GSC_API_ROOT+encodeURIComponent(task.site)+'/sitemaps';
  const data=await jsonFetch(endpoint,{
    method:'GET',
    headers:{
      'Authorization':`Bearer ${token}`,
      'Accept':'application/json'
    }
  },30000,'gsc');

  const sitemaps=(data.sitemap||[]).slice(0,100).map(item=>({
    path:String(item.path||''),
    last_submitted:item.lastSubmitted||null,
    last_downloaded:item.lastDownloaded||null,
    is_pending:Boolean(item.isPending),
    is_sitemaps_index:Boolean(item.isSitemapsIndex),
    type:item.type||null,
    warnings:Number(item.warnings||0),
    errors:Number(item.errors||0),
    contents:(item.contents||[]).map(content=>({
      type:content.type||null,
      submitted:Number(content.submitted||0)
    }))
  }));

  return {
    providerId:'google_search_console',
    modelId:null,
    sourceClass:'search_platform',
    text:JSON.stringify({
      schema:'maison.search-visibility.gsc-sitemaps.v1',
      provider:'google_search_console',
      property:task.site,
      retrieved_at:new Date().toISOString(),
      sitemap_count:sitemaps.length,
      sitemaps
    }),
    citations:[],
    requestId:null,usage:null,
    groundingState:'direct_observation',
    confidenceClass:'high',
    strength:95,
    evidenceSource:'gsc',
    evidenceKind:'coverage',
    independentEvidenceRoots:0,
    sourceKind:'search_visibility'
  };
}

function bingDate(value){
  const m=String(value||'').match(/\/Date\((\d+)/);
  if(m)return new Date(Number(m[1])).toISOString();
  return String(value||'');
}

async function fetchBing(env,task){
  const token=await refreshAccessToken({
    tokenUrl:BING_TOKEN_URL,
    clientId:env.BING_WEBMASTER_CLIENT_ID,
    clientSecret:env.BING_WEBMASTER_CLIENT_SECRET,
    refreshToken:env.BING_WEBMASTER_REFRESH_TOKEN,
    prefix:'bing'
  });
  const endpoint=new URL(task.method,BING_API_ROOT);
  endpoint.searchParams.set('siteUrl',task.site);
  const data=await jsonFetch(endpoint,{
    method:'GET',
    headers:{
      'Authorization':`Bearer ${token}`,
      'Accept':'application/json'
    }
  },30000,'bing');
  const rows=(Array.isArray(data.d)?data.d:[]).slice(0,50).map(row=>({
    key:String(row.Query??'').slice(0,1200),
    date:bingDate(row.Date),
    clicks:Number(row.Clicks||0),
    impressions:Number(row.Impressions||0),
    avg_click_position:Number(row.AvgClickPosition||0),
    avg_impression_position:Number(row.AvgImpressionPosition||0)
  }));

  return {
    providerId:'bing_webmaster',
    modelId:null,
    sourceClass:'search_platform',
    text:JSON.stringify({
      schema:'maison.search-visibility.bing.v1',
      provider:'bing_webmaster',
      site:task.site,
      profile:task.key,
      method:task.method,
      retrieved_at:new Date().toISOString(),
      row_count:rows.length,
      rows
    }),
    citations:[],
    requestId:null,usage:null,
    groundingState:'direct_observation',
    confidenceClass:'high',
    strength:90,
    evidenceSource:'system',
    evidenceKind:'coverage',
    independentEvidenceRoots:0,
    sourceKind:'search_visibility'
  };
}

export async function fetchSearchVisibility(env,task,scheduledDate=new Date()){
  if(task.family==='google_search_console')return fetchGoogle(env,task,scheduledDate);
  if(task.family==='google_url_inspection')return fetchGoogleInspection(env,task,scheduledDate);
  if(task.family==='google_sitemaps')return fetchGoogleSitemaps(env,task);
  if(task.family==='bing_webmaster')return fetchBing(env,task);
  throw new Error('unsupported_search_visibility_family');
}

export const SEARCH_VISIBILITY_DOCS=Object.freeze({
  google_search_console:GSC_DOC,
  google_url_inspection:'https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect',
  google_sitemaps:'https://developers.google.com/webmaster-tools/v1/sitemaps/list',
  bing_webmaster:BING_DOC
});

/*
MAISON JF® · public structured data
Derived only from canonical, indexable public page facts.
No hidden claims, ratings, authors, dates or outcomes may be invented here.
*/

export const MAISON_PUBLIC_SCHEMA_VERSION='2026-09-25-v2';
export const MAISON_SCHEMA_IDS={
  organization:'https://maison-jf.com/#organization',
  website:'https://maison-jf.com/#website'
};

const PUBLIC_TEST_PATHS=new Set([
  '/teste',
  '/teste/atencao',
  '/teste/apego',
  '/teste/afeto',
  '/teste/nunca-chega'
]);

function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function canonicalUrl(v){
  try{
    const u=new URL(String(v||''));
    if(!/^https?:$/.test(u.protocol))return '';
    u.hash='';u.search='';
    if(u.hostname==='www.maison-jf.com')u.hostname='maison-jf.com';
    return u.href;
  }catch(_){return ''}
}
function pathOf(v){
  try{return new URL(v).pathname.replace(/\/+$/,'')||'/'}catch(_){return ''}
}
function withoutBrand(title,pattern){
  return clean(title).replace(pattern,'').trim();
}
function euroPrice(value){
  const m=clean(value).match(/(\d+)(?:[,.](\d{1,2}))?\s*€/);
  if(!m)return '';
  return m[1]+'.'+String(m[2]||'00').padEnd(2,'0');
}
function breadcrumb(id,items){
  return {
    '@type':'BreadcrumbList','@id':id,
    itemListElement:items.map((item,index)=>({
      '@type':'ListItem',
      position:index+1,
      name:item.name,
      item:item.url
    }))
  };
}
function graphFacts(value){
  const types=new Set(),ids=new Set();
  function walk(v){
    if(Array.isArray(v)){v.forEach(walk);return}
    if(!v||typeof v!=='object')return;
    const type=v['@type'];
    if(Array.isArray(type))type.forEach(x=>types.add(String(x)));
    else if(type)types.add(String(type));
    if(v['@id'])ids.add(String(v['@id']));
    Object.values(v).forEach(walk);
  }
  walk(value);
  return {types:[...types].sort(),ids:[...ids].sort()};
}
function basicPage({url,title,description,pageType='WebPage',sectionName,sectionUrl}){
  const pageId=url+'#page',crumbId=url+'#breadcrumb';
  const items=sectionName&&sectionUrl
    ? [{name:sectionName,url:sectionUrl},{name:withoutBrand(title,/\s*\|\s*MAISON\s+JF®?\s*$/i)||title,url}]
    : [{name:'MAISON JF®',url:'https://maison-jf.com/'},{name:withoutBrand(title,/\s*\|\s*MAISON\s+JF®?\s*$/i)||title,url}];
  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':pageType,'@id':pageId,
        url,name:title,description,
        inLanguage:'pt-PT',
        isAccessibleForFree:true,
        isPartOf:{'@id':MAISON_SCHEMA_IDS.website},
        breadcrumb:{'@id':crumbId}
      },
      breadcrumb(crumbId,items)
    ]
  };
}
function articleGraph({url,title,description,sectionName,sectionUrl}){
  const headline=withoutBrand(title,/\s*\|\s*MAISON\s+JF®?\s*$/i)||title;
  const pageId=url+'#page',articleId=url+'#article',crumbId=url+'#breadcrumb';
  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage','@id':pageId,
        url,name:title,description,
        inLanguage:'pt-PT',
        isAccessibleForFree:true,
        isPartOf:{'@id':MAISON_SCHEMA_IDS.website},
        mainEntity:{'@id':articleId},
        breadcrumb:{'@id':crumbId}
      },
      {
        '@type':'Article','@id':articleId,
        headline,description,url,
        inLanguage:'pt-PT',
        isAccessibleForFree:true,
        mainEntityOfPage:{'@id':pageId},
        publisher:{'@id':MAISON_SCHEMA_IDS.organization}
      },
      breadcrumb(crumbId,[
        {name:sectionName,url:sectionUrl},
        {name:headline,url}
      ])
    ]
  };
}

export function isIndexableRobots(value){
  return !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(String(value||''));
}

export function buildOracleStructuredData({url,title,description}){
  url=canonicalUrl(url);
  title=clean(title);description=clean(description);
  if(!url||!title||!description)return null;
  const path=pathOf(url);
  if(!/^\/oraculo\/[^/]+$/.test(path))return null;
  const topic=withoutBrand(title,/\s*\|\s*Oráculo\s+MAISON\s+JF®?\s*$/i)||title;
  const pageId=url+'#page',serviceId=url+'#service',crumbId=url+'#breadcrumb';
  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage','@id':pageId,
        url,name:title,description,
        inLanguage:'pt-PT',
        isPartOf:{'@id':MAISON_SCHEMA_IDS.website},
        mainEntity:{'@id':serviceId},
        about:{'@id':serviceId},
        breadcrumb:{'@id':crumbId}
      },
      {
        '@type':'Service','@id':serviceId,
        name:'Oráculo MAISON JF® · '+topic,
        description,
        serviceType:'Leitura simbólica',
        provider:{'@id':MAISON_SCHEMA_IDS.organization},
        url,
        offers:{
          '@type':'Offer',
          price:'2.00',
          priceCurrency:'EUR',
          url
        }
      },
      breadcrumb(crumbId,[
        {name:'Oráculo',url:'https://maison-jf.com/oraculo/'},
        {name:topic,url}
      ])
    ]
  };
}

export function buildAnswerStructuredData({url,title,description}){
  url=canonicalUrl(url);
  title=clean(title);description=clean(description);
  if(!url||!title||!description)return null;
  const path=pathOf(url);
  if(!/^\/respostas\/[^/]+$/.test(path))return null;
  return articleGraph({
    url,title,description,
    sectionName:'MAISON JF®',
    sectionUrl:'https://maison-jf.com/'
  });
}

export function buildTestStructuredData({url,title,description}){
  url=canonicalUrl(url);
  title=clean(title);description=clean(description);
  if(!url||!title||!description)return null;
  const path=pathOf(url);
  if(!PUBLIC_TEST_PATHS.has(path))return null;
  return basicPage({
    url,title,description,
    pageType:path==='/teste'?'CollectionPage':'WebPage',
    sectionName:'Volta Para Casa',
    sectionUrl:'https://maison-jf.com/teste/'
  });
}

export function buildEbookStructuredData({url,title,description,priceText}){
  url=canonicalUrl(url);
  title=clean(title);description=clean(description);
  const price=euroPrice(priceText);
  if(!url||!title||!description||!price)return null;
  const path=pathOf(url);
  if(!/^\/ebooks\/[^/]+$/.test(path))return null;
  const name=withoutBrand(title,/\s*\|\s*MAISON\s+JF®?\s*$/i)||title;
  const pageId=url+'#page',bookId=url+'#book',crumbId=url+'#breadcrumb';
  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage','@id':pageId,
        url,name:title,description,
        inLanguage:'pt-PT',
        isPartOf:{'@id':MAISON_SCHEMA_IDS.website},
        mainEntity:{'@id':bookId},
        breadcrumb:{'@id':crumbId}
      },
      {
        '@type':'Book','@id':bookId,
        name,description,url,
        inLanguage:'pt-PT',
        bookFormat:'https://schema.org/EBook',
        isAccessibleForFree:false,
        offers:{
          '@type':'Offer',
          price,
          priceCurrency:'EUR',
          url
        }
      },
      breadcrumb(crumbId,[
        {name:'Biblioteca',url:'https://maison-jf.com/ebooks/'},
        {name,url}
      ])
    ]
  };
}

export function buildProfessionalStructuredData({url,title,description}){
  url=canonicalUrl(url);
  title=clean(title);description=clean(description);
  if(!url||!title||!description)return null;
  const path=pathOf(url);
  if(path==='/profissionais'){
    return basicPage({
      url,title,description,
      pageType:'CollectionPage',
      sectionName:'MAISON JF®',
      sectionUrl:'https://maison-jf.com/'
    });
  }
  const m=path.match(/^\/profissionais\/([^/]+)$/);
  if(!m||m[1]==='teste')return null;
  if(/^(?:como-|o-que-)/.test(m[1])){
    return articleGraph({
      url,title,description,
      sectionName:'Profissionais',
      sectionUrl:'https://maison-jf.com/profissionais/'
    });
  }
  const name=withoutBrand(title,/\s*\|\s*MAISON\s+JF®?\s*$/i)||title;
  const pageId=url+'#page',serviceId=url+'#service',crumbId=url+'#breadcrumb';
  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage','@id':pageId,
        url,name:title,description,
        inLanguage:'pt-PT',
        isPartOf:{'@id':MAISON_SCHEMA_IDS.website},
        mainEntity:{'@id':serviceId},
        breadcrumb:{'@id':crumbId}
      },
      {
        '@type':'Service','@id':serviceId,
        name,description,url,
        serviceType:'Proposta B2B MAISON JF®',
        provider:{'@id':MAISON_SCHEMA_IDS.organization}
      },
      breadcrumb(crumbId,[
        {name:'Profissionais',url:'https://maison-jf.com/profissionais/'},
        {name,url}
      ])
    ]
  };
}

export function buildPressStructuredData({url,title,description}){
  url=canonicalUrl(url);title=clean(title);description=clean(description);
  if(pathOf(url)!=='/press'||!title||!description)return null;
  const schema=basicPage({
    url,title,description,pageType:'AboutPage',
    sectionName:'MAISON JF®',sectionUrl:'https://maison-jf.com/'
  });
  schema['@graph'][0].about={'@id':MAISON_SCHEMA_IDS.organization};
  return schema;
}

export function buildShippingStructuredData({url,title,description}){
  url=canonicalUrl(url);title=clean(title);description=clean(description);
  if(pathOf(url)!=='/envios'||!title||!description)return null;
  return basicPage({
    url,title,description,pageType:'WebPage',
    sectionName:'MAISON JF®',sectionUrl:'https://maison-jf.com/'
  });
}

export function buildEditorialStructuredData({url,title,description}){
  url=canonicalUrl(url);title=clean(title);description=clean(description);
  if(!url||!title||!description)return null;
  const path=pathOf(url);
  if(/^\/trabalho\/[^/]+$/.test(path)){
    return articleGraph({
      url,title,description,
      sectionName:'MAISON JF®',sectionUrl:'https://maison-jf.com/'
    });
  }
  if(path==='/espiritualidade/protecao-energetica'){
    return articleGraph({
      url,title,description,
      sectionName:'MAISON JF®',sectionUrl:'https://maison-jf.com/'
    });
  }
  return null;
}

export function buildPresentsStructuredData({url,title,description}){
  url=canonicalUrl(url);title=clean(title);description=clean(description);
  if(pathOf(url)!=='/presentes'||!title||!description)return null;
  return basicPage({
    url,title,description,pageType:'CollectionPage',
    sectionName:'MAISON JF®',sectionUrl:'https://maison-jf.com/'
  });
}

export function derivedSchemaForPublicPage({
  url,title,description,robots,priceText,staticJsonLdBlocks=0
}={}){
  if(Number(staticJsonLdBlocks)>0||!isIndexableRobots(robots))return null;
  const normalized=canonicalUrl(url);
  const path=pathOf(normalized);
  if(/^\/oraculo\/[^/]+$/.test(path)){
    return buildOracleStructuredData({url:normalized,title,description});
  }
  if(/^\/respostas\/[^/]+$/.test(path)){
    return buildAnswerStructuredData({url:normalized,title,description});
  }
  if(PUBLIC_TEST_PATHS.has(path)){
    return buildTestStructuredData({url:normalized,title,description});
  }
  if(/^\/ebooks\/[^/]+$/.test(path)){
    return buildEbookStructuredData({url:normalized,title,description,priceText});
  }
  if(path==='/profissionais'||/^\/profissionais\/[^/]+$/.test(path)){
    return buildProfessionalStructuredData({url:normalized,title,description});
  }
  if(path==='/press')return buildPressStructuredData({url:normalized,title,description});
  if(path==='/envios')return buildShippingStructuredData({url:normalized,title,description});
  if(/^\/trabalho\/[^/]+$/.test(path)||path==='/espiritualidade/protecao-energetica'){
    return buildEditorialStructuredData({url:normalized,title,description});
  }
  if(path==='/presentes')return buildPresentsStructuredData({url:normalized,title,description});
  return null;
}

export function structuredDataFacts(schema){
  return graphFacts(schema);
}

export function structuredDataScript(schema){
  if(!schema)return '';
  const json=JSON.stringify(schema).replace(/</g,'\\u003c');
  return '<script type="application/ld+json" data-maison-derived-schema="'+
    MAISON_PUBLIC_SCHEMA_VERSION+'">'+json+'</script>';
}

import {
  derivedSchemaForPublicPage,
  structuredDataScript
} from './public-structured-data.js';

function htmlResponse(response){
  return /(?:^|;)\s*text\/html(?:;|$)/i.test(response.headers.get('content-type')||'');
}

export async function applyMaisonPublicStructuredData(context){
  if(context.request.method!=='GET')return context.next();
  const response=await context.next();
  if(!htmlResponse(response))return response;

  const state={
    title:'',
    description:'',
    robots:'',
    canonical:'',
    priceText:'',
    hasJsonLd:false
  };

  const rewriter=new HTMLRewriter()
    .on('title',{
      text(chunk){state.title+=chunk.text}
    })
    .on('meta[name="description"]',{
      element(el){state.description=el.getAttribute('content')||''}
    })
    .on('meta[name="robots"]',{
      element(el){state.robots=el.getAttribute('content')||''}
    })
    .on('link[rel="canonical"]',{
      element(el){state.canonical=el.getAttribute('href')||''}
    })
    .on('[data-price]',{
      text(chunk){state.priceText+=chunk.text}
    })
    .on('script[type="application/ld+json"]',{
      element(){state.hasJsonLd=true}
    })
    .on('head',{
      element(head){
        head.onEndTag(end=>{
          const requestUrl=new URL(context.request.url);
          requestUrl.search='';requestUrl.hash='';
          const schema=derivedSchemaForPublicPage({
            url:state.canonical||requestUrl.href,
            title:state.title,
            description:state.description,
            robots:state.robots,
            priceText:state.priceText,
            staticJsonLdBlocks:state.hasJsonLd?1:0
          });
          const script=structuredDataScript(schema);
          if(script)end.before(script,{html:true});
        });
      }
    });

  return rewriter.transform(response);
}

import {buildIndexNowManifest} from './build_indexnow_manifest.mjs';

if(process.env.INDEXNOW_SUBMIT_ENABLED!=='true'){
  console.error('IndexNow live submission requires INDEXNOW_SUBMIT_ENABLED=true');
  process.exit(2);
}

const manifest=buildIndexNowManifest();
const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'Content-Type':'application/json; charset=utf-8'},
  body:JSON.stringify({
    host:manifest.host,
    key:manifest.key,
    keyLocation:manifest.keyLocation,
    urlList:manifest.urlList
  })
});

const body=await response.text();
console.log(JSON.stringify({
  endpoint:'https://api.indexnow.org/indexnow',
  status:response.status,
  accepted:response.status===200||response.status===202,
  url_count:manifest.url_count,
  latest_lastmod:manifest.latest_lastmod,
  body:body.slice(0,500)
},null,2));

if(![200,202].includes(response.status))process.exit(1);

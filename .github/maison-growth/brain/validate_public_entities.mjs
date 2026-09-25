import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const ORG_ID='https://maison-jf.com/#organization';
const SITE_ID='https://maison-jf.com/#website';
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const entityEvidence=JSON.parse(read('.github/maison-growth/brain/public-entity-evidence.json'));
const expectedSameAs=entityEvidence.same_as.map(item=>item.public_url).sort();

function jsonLd(html){
  const out=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{out.push(JSON.parse(m[1]))}catch(error){
      throw new Error('invalid_jsonld:'+error.message);
    }
  }
  return out;
}
function walk(value,fn){
  if(Array.isArray(value)){value.forEach(v=>walk(v,fn));return}
  if(!value||typeof value!=='object')return;
  fn(value);
  Object.values(value).forEach(v=>walk(v,fn));
}
function hasType(node,type){
  const t=node['@type'];
  return Array.isArray(t)?t.includes(type):t===type;
}
function browserData(rel,key){
  const sandbox={window:{}};
  vm.runInNewContext(read(rel),sandbox,{filename:rel});
  return sandbox.window[key];
}

const discovery=buildPublicDiscovery();
const htmlFiles=[...new Set(discovery.pages.map(page=>page.source_file))];
const organizationDefinitions=[];
const websiteDefinitions=[];
const anonymousOrganizations=[];
const publicServiceNames=new Set();
let serializedPublicSchema='';

for(const file of htmlFiles){
  const schemas=jsonLd(read(file));
  serializedPublicSchema+='\n'+schemas.map(x=>JSON.stringify(x)).join('\n');
  for(const schema of schemas){
    walk(schema,node=>{
      if(hasType(node,'Organization')){
        if(node['@id']===ORG_ID)organizationDefinitions.push({file,node});
        else anonymousOrganizations.push({file,node});
      }
      if(hasType(node,'WebSite'))websiteDefinitions.push({file,node});
      if(hasType(node,'Service')&&node.name)publicServiceNames.add(String(node.name));
    });
  }
}

assert(organizationDefinitions.length>=1,'canonical Organization definition missing');
for(const {file,node} of organizationDefinitions){
  assert.equal(node['@id'],ORG_ID,file+': wrong organization @id');
  assert.equal(node.name,'MAISON JF®',file+': wrong organization name');
  assert.equal(node.url,'https://maison-jf.com/',file+': wrong organization URL');
  assert.equal(node.logo,'https://maison-jf.com/maison-jf-mark.svg',file+': wrong organization logo');
  assert.equal(
    node.hasMerchantReturnPolicy?.merchantReturnLink,
    'https://maison-jf.com/informacao-legal#livre-resolucao',
    file+': wrong merchant return policy link'
  );
  assert.deepEqual(
    [...(node.sameAs||[])].sort(),
    expectedSameAs,
    file+': Organization sameAs must match verified public entity evidence'
  );
}
assert.deepEqual(
  anonymousOrganizations.map(x=>x.file),
  [],
  'public JSON-LD must not create anonymous/parallel Organization nodes'
);

assert(websiteDefinitions.length>=1,'canonical WebSite definition missing');
for(const {file,node} of websiteDefinitions){
  assert.equal(node['@id'],SITE_ID,file+': wrong website @id');
  assert.equal(node.url,'https://maison-jf.com/',file+': wrong website URL');
  assert.equal(node.name,'MAISON JF®',file+': wrong website name');
  assert.equal(node.inLanguage,'pt-PT',file+': wrong website language');
  assert.equal(node.publisher?.['@id'],ORG_ID,file+': wrong website publisher');
}

const tarotSchemas=jsonLd(read('servicos/tarot/index.html'));
let tarotService=null;
for(const schema of tarotSchemas){
  walk(schema,node=>{if(hasType(node,'Service')&&/Tarot/i.test(String(node.name||'')))tarotService=node});
}
assert(tarotService,'Tarot Service JSON-LD missing');
assert.equal(tarotService.provider?.['@id'],ORG_ID,'Tarot provider must reference canonical Organization');

const services=browserData('data/services.js','MAISON_SERVICES');
const hidden=services.filter(service=>service.public===false).map(service=>service.name);
assert(hidden.length>0,'expected explicitly non-public services');
for(const name of hidden){
  assert(
    !publicServiceNames.has(name),
    'non-public service leaked as public Service entity: '+name
  );
}

assert.equal(entityEvidence.organization_id,ORG_ID,'entity evidence must target canonical Organization');
for(const pending of entityEvidence.pending_not_published||[]){
  if(pending.public_url){
    assert(
      !serializedPublicSchema.includes(String(pending.public_url)),
      'pending/unverified profile URL leaked into public JSON-LD: '+pending.platform
    );
  }
}

console.log(
  'MAISON public entity contract: OK · '+
  organizationDefinitions.length+' canonical Organization definitions · '+
  websiteDefinitions.length+' WebSite definitions · '+
  hidden.length+' non-public services excluded · '+expectedSameAs.length+' verified sameAs profiles'
);

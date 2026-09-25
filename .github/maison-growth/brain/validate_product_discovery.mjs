import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

function browserData(rel,key){
  const sandbox={window:{}};
  vm.runInNewContext(read(rel),sandbox,{filename:rel});
  return sandbox.window[key];
}
function jsonLd(html){
  const out=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    out.push(JSON.parse(m[1]));
  }
  return out;
}
function walk(value,fn){
  if(Array.isArray(value)){value.forEach(v=>walk(v,fn));return}
  if(!value||typeof value!=='object')return;
  fn(value);
  Object.values(value).forEach(v=>walk(v,fn));
}
function productSchema(html){
  let found=null;
  for(const schema of jsonLd(html)){
    walk(schema,node=>{
      const t=node['@type'];
      if((Array.isArray(t)?t.includes('Product'):t==='Product')&&!found)found=node;
    });
  }
  return found;
}
function availability(value){
  return {
    in_stock:'https://schema.org/InStock',
    out_of_stock:'https://schema.org/OutOfStock',
    preorder:'https://schema.org/PreOrder'
  }[value];
}
function condition(value){
  return {
    new:'https://schema.org/NewCondition',
    used:'https://schema.org/UsedCondition',
    refurbished:'https://schema.org/RefurbishedCondition'
  }[value];
}

const products=browserData('data/products.js','MAISON_PRODUCTS');
assert(Array.isArray(products)&&products.length>0);

for(const p of products){
  const rel='produtos/'+p.slug+'/index.html';
  const html=read(rel);
  const schema=productSchema(html);
  assert(schema,rel+': Product JSON-LD missing');

  const expectedName=p.name+(p.size?' '+p.size:'');
  const expectedUrl='https://maison-jf.com/produtos/'+p.slug+'/';

  assert(
    html.includes('<title>'+expectedName+' | MAISON JF®</title>'),
    rel+': static title drift'
  );
  assert.equal(schema.name,expectedName,rel+': schema name drift');
  assert.equal(schema.description,p.description,rel+': schema description drift');
  assert.equal(schema.url,expectedUrl,rel+': schema URL drift');
  assert.equal(schema.sku,p.sku,rel+': schema SKU drift');
  assert.equal(schema.brand?.name,'MAISON JF®',rel+': schema brand drift');

  assert(schema.offers,rel+': Offer missing');
  assert.equal(schema.offers.url,expectedUrl,rel+': offer URL drift');
  assert.equal(schema.offers.price,Number(p.price).toFixed(2),rel+': offer price drift');
  assert.equal(schema.offers.priceCurrency,p.currency||'EUR',rel+': offer currency drift');
  assert.equal(schema.offers.availability,availability(p.availability),rel+': offer availability drift');
  assert.equal(schema.offers.itemCondition,condition(p.condition),rel+': offer condition drift');
}

const runtime=read('produtos/detail.js');
assert(
  runtime.includes("document.title=`${p.name}${p.size?' '+p.size:''} | MAISON JF®`;"),
  'product runtime must preserve size in title'
);
assert(runtime.includes('href="${root}envios"'),'product runtime must link canonical Envios URL');
assert(runtime.includes('href="${root}informacao-legal"'),'product runtime must link canonical legal URL');
assert(!runtime.includes('href="${root}envios.html"'),'runtime must not recreate .html Envios links');
assert(!runtime.includes('href="${root}informacao-legal.html"'),'runtime must not recreate .html legal links');

console.log('MAISON product discovery contract: OK · '+products.length+' product pages aligned');

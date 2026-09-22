import fs from 'node:fs';
import vm from 'node:vm';

const SITE='https://maison-jf.com';
const source=fs.readFileSync(new URL('../data/products.js',import.meta.url),'utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'data/products.js'});
const products=Array.isArray(sandbox.window.MAISON_PRODUCTS)?sandbox.window.MAISON_PRODUCTS:[];

const eligible=products.filter(p=>p&&p.slug&&p.productImage&&p.price!=null&&p.availability);
const absolute=value=>{
  const raw=String(value||'');
  if(/^https?:\/\//i.test(raw))return raw;
  return SITE+'/'+raw.replace(/^\.\.\//,'').replace(/^\.\//,'').replace(/^\//,'');
};
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

const googleItems=eligible.map(p=>`
    <item>
      <g:id>${esc(p.sku||('maisonjf-'+p.slug))}</g:id>
      <g:title>${esc(p.name+(p.size?' '+p.size:''))}</g:title>
      <g:description>${esc(p.description)}</g:description>
      <g:link>${SITE}/produtos/${encodeURIComponent(p.slug)}/</g:link>
      <g:image_link>${esc(absolute(p.productImage))}</g:image_link>
      <g:availability>${esc(p.availability)}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} ${esc(p.currency||'EUR')}</g:price>
      <g:condition>${esc(p.condition||'new')}</g:condition>
      <g:brand>MAISON JF®</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`).join('\n');

const google=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MAISON JF®</title>
    <link>${SITE}/</link>
    <description>Produtos físicos MAISON JF® para Google Merchant Center. Só entram referências com fotografia real de produto.</description>
${googleItems}
  </channel>
</rss>
`;
fs.writeFileSync(new URL('../merchant-feed.xml',import.meta.url),google);

const openai=eligible.map(p=>JSON.stringify({
  item_id:String(p.sku||('maisonjf-'+p.slug)),
  title:p.name+(p.size?' '+p.size:''),
  description:p.description,
  url:`${SITE}/produtos/${encodeURIComponent(p.slug)}/`,
  brand:'MAISON JF®',
  seller_name:'MAISON JF®',
  image_url:absolute(p.productImage),
  availability:p.availability==='preorder'?'pre_order':p.availability,
  price:`${Number(p.price).toFixed(2)} ${p.currency||'EUR'}`,
  condition:p.condition||'new',
  product_category:p.category||undefined
})).join('\n');
fs.writeFileSync(new URL('../openai-products.jsonl',import.meta.url),openai+(openai?'\n':''));

console.log(`Generated commerce feeds for ${eligible.length} product(s). ${products.length-eligible.length} omitted until a real product image is configured.`);

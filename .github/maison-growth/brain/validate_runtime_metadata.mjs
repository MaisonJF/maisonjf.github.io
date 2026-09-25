import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

function languageConvert(){
  const sandbox={
    window:{},
    document:{readyState:'loading',addEventListener(){}}
  };
  vm.runInNewContext(read('maison-language.js'),sandbox,{filename:'maison-language.js'});
  assert.equal(typeof sandbox.window.MaisonLanguage?.convert,'function');
  return sandbox.window.MaisonLanguage.convert;
}
function duplicates(rows,key){
  const map=new Map();
  for(const row of rows){
    const value=String(row[key]||'').trim().toLocaleLowerCase('pt-PT');
    if(!value)continue;
    if(!map.has(value))map.set(value,[]);
    map.get(value).push(row.url);
  }
  return [...map.entries()].filter(([,urls])=>urls.length>1);
}

const convert=languageConvert();
const discovery=buildPublicDiscovery();
const rendered=[];
let convertedPages=0;

for(const page of discovery.pages){
  const html=read(page.source_file);
  const usesLanguage=/analytics\.js(?:\?[^"'\s>]*)?/i.test(html);
  const title=usesLanguage?convert(page.title):page.title;
  const description=usesLanguage?convert(page.description):page.description;
  if(title!==page.title||description!==page.description)convertedPages++;
  rendered.push({
    url:page.url,
    title,
    description,
    source_file:page.source_file,
    uses_language_runtime:usesLanguage
  });
}

const missing=rendered.filter(row=>!row.title||!row.description);
const duplicateTitles=duplicates(rendered,'title');
const duplicateDescriptions=duplicates(rendered,'description');

assert.deepEqual(missing,[],'runtime-rendered metadata must remain complete');
assert.deepEqual(duplicateTitles,[],'runtime-rendered titles must remain unique');
assert.deepEqual(duplicateDescriptions,[],'runtime-rendered descriptions must remain unique');

console.log(
  'MAISON runtime metadata contract: OK · '+
  rendered.length+' public pages · '+
  convertedPages+' metadata surfaces normalized at runtime'
);

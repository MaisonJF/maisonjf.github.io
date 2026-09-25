#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const registryPath=path.join(HERE,'source-registry.json');
const outputPath=path.join(ROOT,'functions/_lib/a2-commerce-contract.generated.js');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const commerce=registry?.sources?.commerce;
if(!commerce)throw new Error('missing A2 commerce source');

const events=Object.fromEntries(
  Object.entries(commerce.events||{})
    .filter(([eventType])=>eventType.startsWith('b2b.'))
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([eventType,spec])=>[
      eventType,{
        required_metadata:[...(spec.required_metadata||[])],
        allowed_metadata:[...(spec.allowed_metadata||[])],
      }
    ])
);
if(!events['b2b.lead'])throw new Error('missing A2 b2b.lead event');

const generated=`// GENERATED from .github/maison-growth/a2/source-registry.json
// Do not edit by hand. Run build_runtime_commerce_contract.mjs.
export const A2_COMMERCE_B2B_EVENTS=Object.freeze(${JSON.stringify(events,null,2)});
`;

if(process.argv.includes('--check')){
  const current=fs.existsSync(outputPath)?fs.readFileSync(outputPath,'utf8'):'';
  if(current!==generated){
    console.error('a2_commerce_runtime_contract_out_of_sync');
    process.exit(1);
  }
  console.log('A2 commerce runtime contract: OK');
}else{
  fs.writeFileSync(outputPath,generated);
  console.log(path.relative(ROOT,outputPath));
}

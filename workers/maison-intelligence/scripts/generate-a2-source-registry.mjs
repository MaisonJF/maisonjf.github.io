#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const registryPath=path.join(root,'.github/maison-growth/a2/source-registry.json');
const outputPath=path.join(root,'workers/maison-intelligence/src/a2_source_registry.generated.js');

const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const canonical=JSON.stringify(registry,null,2);
const output=`// GENERATED from .github/maison-growth/a2/source-registry.json
// Do not edit by hand. Run scripts/generate-a2-source-registry.mjs.
export const A2_SOURCE_REGISTRY=${canonical};
export default A2_SOURCE_REGISTRY;
`;

if(process.argv.includes('--check')){
  const current=fs.existsSync(outputPath)?fs.readFileSync(outputPath,'utf8'):'';
  if(current!==output){
    console.error('A2 generated source registry is stale.');
    process.exit(1);
  }
  console.log('A2 generated source registry: OK');
}else{
  fs.writeFileSync(outputPath,output);
  console.log('Generated',path.relative(root,outputPath));
}

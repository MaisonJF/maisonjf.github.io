#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const input=path.join(root,'.github/maison-growth/a3/conversion-event-types.json');
const output=path.join(root,'workers/maison-intelligence/src/a3_conversion_types.generated.js');
const contract=JSON.parse(fs.readFileSync(input,'utf8'));
const rendered=`// GENERATED from .github/maison-growth/a3/conversion-event-types.json
// Do not edit by hand.
export const A3_CONVERSION_EVENT_TYPES=${JSON.stringify(contract.event_types,null,2)};
export default A3_CONVERSION_EVENT_TYPES;
`;
if(process.argv.includes('--check')){
  const current=fs.existsSync(output)?fs.readFileSync(output,'utf8'):'';
  if(current!==rendered){console.error('A3 conversion map is stale.');process.exit(1);}
  console.log('A3 conversion map: OK');
}else{
  fs.writeFileSync(output,rendered);
  console.log('Generated',path.relative(root,output));
}

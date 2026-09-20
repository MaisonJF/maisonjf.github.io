import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const SOURCE=path.join(ROOT,'.github/maison-growth/oceans/candidates.json');
const TARGET=path.join(ROOT,'functions/_lib/vpc-ocean-signals.generated.js');
const check=process.argv.includes('--check');

const raw=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
const candidates=(raw.candidates||[])
  .filter(item=>item&&item.questionPotential===true)
  .map(item=>({
    id:String(item.territory||'').trim(),
    painLanguage:String(item.painLanguage||'').trim(),
    intent:String(item.intent||'').trim(),
    themes:Array.isArray(item.questionThemeCandidates)?item.questionThemeCandidates.map(String).filter(Boolean).slice(0,12):[]
  }))
  .filter(item=>item.id&&item.painLanguage);

const body=[
  '/* AUTO-GENERATED from .github/maison-growth/oceans/candidates.json. */',
  '/* Do not edit by hand. Run build_vpc_ocean_signals.mjs. */',
  'export const VPC_OCEAN_SIGNALS='+JSON.stringify(candidates,null,2)+';',
  'export const VPC_OCEAN_SIGNAL_VERSION='+JSON.stringify(String(raw.version||'unknown'))+';',
  ''
].join('\n');

if(check){
  const current=fs.existsSync(TARGET)?fs.readFileSync(TARGET,'utf8'):'';
  if(current!==body){
    console.error('VPC Ocean signal bridge is stale. Run node .github/maison-growth/brain/build_vpc_ocean_signals.mjs');
    process.exit(1);
  }
  console.log('VPC Ocean signal bridge is in sync:',candidates.length,'signals');
}else{
  fs.writeFileSync(TARGET,body);
  console.log('Wrote',path.relative(ROOT,TARGET),'with',candidates.length,'question-capable Ocean signals');
}

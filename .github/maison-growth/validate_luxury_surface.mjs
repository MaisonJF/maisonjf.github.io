import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const fail=msg=>{throw new Error(msg)};

const home=read('index.html');
if(/0[1-4]\s*·\s*(Casa|Corpo|Cabeça|Presença)/i.test(home))fail('decorative_home_door_numbering_returned');

for(const p of ['portas/casa.html','portas/corpo.html','portas/cabeca.html']){
  const html=read(p);
  if(html.includes('€'))fail('discovery_price_returned:'+p);
  if(/maison\.css\?v=20260920-architecture1/.test(html))fail('stale_porta_css:'+p);
}

const retiredPresence=read('portas/presenca.html');
if(!/noindex,nofollow/.test(retiredPresence)||!/location\.replace\('\/servicos\/'\)/.test(retiredPresence))fail('retired_presence_route_must_redirect');

for(const p of ['produtos/index.html','presentes/index.html','ebooks/index.html','oraculo/index.html']){
  const html=read(p);
  if(p==='produtos/index.html'){
    const approvedBundlePrice='Três combinações de produtos para oferecer ou criar o teu próprio momento, desde 10 €.';
    if(!html.includes(approvedBundlePrice))fail('bundle_offer_price_contract_missing');
    if(html.replace(approvedBundlePrice,'').includes('€'))fail('discovery_price_returned:'+p);
  }else if(html.includes('€')){
    fail('discovery_price_returned:'+p);
  }
}

const css=read('maison.css');
if(!css.includes('QUIET LUXURY / GOLD DETAIL SYSTEM'))fail('quiet_luxury_css_missing');
for(const token of ['--maison-gold:#c7aa73','a.territory-offer','.pro-card','.presence-card']){
  if(!css.includes(token))fail('quiet_luxury_token_missing:'+token);
}

console.log('Quiet-luxury discovery guard: OK');

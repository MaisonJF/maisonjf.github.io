import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OCEAN_CATALOG,
  OCEAN_CATALOG_VERSION,
  OCEAN_PILLARS,
  isFoundationalOceanKey,
  isValidOceanKey,
  selectOceanFocus,
  selectPillarFocus,
  validateOceanProposal,
  validatePillarProposal
} from '../src/ocean_catalog.js';

test('foundational Ocean catalogue has unique, valid keys and covers every pillar',()=>{
  assert.match(OCEAN_CATALOG_VERSION,/^JF-OCEANS-/);
  assert.ok(OCEAN_PILLARS.length>=40,'the network must support a broad specialist pillar map');
  assert.ok(OCEAN_CATALOG.length>=100);
  const keys=OCEAN_CATALOG.map(ocean=>ocean.ocean_key);
  assert.equal(new Set(keys).size,keys.length,'Ocean keys must be unique');
  const knownKeys=new Set(keys);
  for(const ocean of OCEAN_CATALOG){
    assert.ok(isValidOceanKey(ocean.ocean_key),ocean.ocean_key);
    assert.ok(ocean.display_name.length>=3,ocean.ocean_key);
    assert.ok(ocean.mission.length>=20,ocean.ocean_key);
    assert.ok(OCEAN_PILLARS.some(pillar=>pillar.key===ocean.pillar_key),ocean.ocean_key);
    for(const link of ocean.connections)assert.ok(knownKeys.has(link),`${ocean.ocean_key} -> ${link}`);
    assert.equal(ocean.lifecycle_state,'open');
  }
  for(const pillar of OCEAN_PILLARS){
    assert.ok(OCEAN_CATALOG.some(ocean=>ocean.pillar_key===pillar.key),pillar.key);
  }
});

test('dedicated brand, interactive book, games and Feral voice Oceans remain distinct',()=>{
  for(const key of [
    'brand-tom-ford','brand-dior','brand-yves-saint-laurent',
    'first-thirteen-book-cycle','future-book-universes',
    'interactive-book-games','digital-game-concepts',
    'two-player-games','group-party-games','brand-voice-feral-frontality',
    'proven-aroma-formulas','supplier-intelligence','unexplored-territories',
    'geo-synthetic-search-visibility'
  ]){
    assert.ok(isFoundationalOceanKey(key),key);
  }
  const firstSeries=OCEAN_CATALOG.find(ocean=>ocean.ocean_key==='first-thirteen-book-cycle');
  assert.match(firstSeries.mission,/12 livros e um 13.º volume/);
  const feral=OCEAN_CATALOG.find(ocean=>ocean.ocean_key==='brand-voice-feral-frontality');
  assert.match(feral.mission,/irreverência/);
  assert.match(feral.mission,/sem copiar/);
  const geo=OCEAN_CATALOG.find(ocean=>ocean.ocean_key==='geo-synthetic-search-visibility');
  assert.equal(geo.pillar_key,'search-visibility-authority');
  assert.match(geo.mission,/sistemas de resposta por IA/);
  assert.ok(geo.connections.includes('customer-search-language'));
  const searchPillar=OCEAN_PILLARS.find(pillar=>pillar.key==='search-visibility-authority');
  assert.ok(searchPillar.connections.includes('conversion-growth-experiments'));
});

test('focus selection covers all pillars, returns only valid Ocean cross-links, and rotates brand study',()=>{
  const first=selectOceanFocus({catalog:OCEAN_CATALOG,pillars:OCEAN_PILLARS,runKey:'2026-10-27:03:00:openrouter-a',limit:16});
  const second=selectOceanFocus({catalog:OCEAN_CATALOG,pillars:OCEAN_PILLARS,runKey:'2026-10-27:15:00:openrouter-b',limit:16});
  const fullPillarSweep=selectOceanFocus({catalog:OCEAN_CATALOG,pillars:OCEAN_PILLARS,runKey:'all-pillars-validation',limit:OCEAN_PILLARS.length});
  assert.equal(first.length,16);
  assert.equal(second.length,16);
  assert.equal(fullPillarSweep.length,OCEAN_PILLARS.length);
  for(const pillar of OCEAN_PILLARS){
    assert.ok(fullPillarSweep.some(ocean=>ocean.pillar_key===pillar.key),pillar.key);
    assert.ok(OCEAN_CATALOG.some(ocean=>ocean.pillar_key===pillar.key),`pillar with no foundational Ocean: ${pillar.key}`);
  }
  const known=new Set(OCEAN_CATALOG.map(ocean=>ocean.ocean_key));
  for(const ocean of [...first,...second]){
    assert.ok(known.has(ocean.ocean_key),ocean.ocean_key);
    for(const related of ocean.connections) assert.ok(known.has(related),`${ocean.ocean_key} -> ${related}`);
  }
  const brandsA=first.filter(ocean=>ocean.ocean_key.startsWith('brand-')).map(ocean=>ocean.ocean_key);
  const brandsB=second.filter(ocean=>ocean.ocean_key.startsWith('brand-')).map(ocean=>ocean.ocean_key);
  assert.ok(brandsA.length>=1);
  assert.ok(brandsB.length>=1);
  assert.notDeepEqual(brandsA,brandsB,'brand research should rotate with the run key');
});

test('pillar focus follows graph neighbours and rotates through long-tail dynamic pillars',()=>{
  const dynamicPillars=Array.from({length:300},(_,index)=>({
    key:'dynamic-area-'+String(index).padStart(3,'0'),
    name:'Dynamic area '+index,
    mission:'Investigate an approved specialist territory and its cross-domain relationships.',
    focus:['emerging topic','research direction'],
    connections:index%2===0?['research-evidence-analytics']:['market-innovation-opportunities'],
    parent_pillars:[],
    lifecycle_state:'open',
    origin:'human_approved_dynamic'
  }));
  const pillars=[...OCEAN_PILLARS,...dynamicPillars];
  const focusOceans=[{ocean_key:'olfactory-universe',pillar_key:'scent-science-research'}];
  const first=selectPillarFocus({pillars,focusOceans,runKey:'rotating-network-run-A',limit:32});
  const second=selectPillarFocus({pillars,focusOceans,runKey:'rotating-network-run-B',limit:32});
  const seedPillar=OCEAN_PILLARS.find(p=>p.key==='scent-science-research');
  assert.ok(first.some(p=>p.key==='scent-science-research'));
  assert.ok(seedPillar.connections.some(key=>first.some(p=>p.key===key)));
  assert.ok(first.some(p=>p.key.startsWith('dynamic-area-')));
  assert.ok(second.some(p=>p.key.startsWith('dynamic-area-')));
  assert.notDeepEqual(
    first.filter(p=>p.key.startsWith('dynamic-area-')).map(p=>p.key),
    second.filter(p=>p.key.startsWith('dynamic-area-')).map(p=>p.key),
    'long-tail pillar discovery must rotate between runs'
  );
});

test('pillar proposals are connected, distinct, and human-governed before registry insertion',()=>{
  const proposal={
    proposed_pillar_key:'neuroaesthetics-sensory-environments',
    display_name:'Neuroaesthetics & Sensory Environments',
    mission:'Investigar relações entre percepção, ambiente, experiência estética e escolhas de design com evidência e limitações explícitas.',
    focus:['percepção do espaço','experiência estética','ambiente e atenção'],
    connections:['scent-science-research','visual-sensory-design','research-evidence-analytics'],
    parent_pillars:['scent-science-research']
  };
  const clean=validatePillarProposal(proposal,OCEAN_PILLARS);
  assert.equal(clean.key,proposal.proposed_pillar_key);
  assert.equal(clean.display_name,proposal.display_name);
  assert.deepEqual(clean.connections,proposal.connections);
  assert.deepEqual(clean.parent_pillars,proposal.parent_pillars);
  assert.throws(()=>validatePillarProposal({...proposal,proposed_pillar_key:'scent-science-research'},OCEAN_PILLARS),/pillar_proposal_key_exists/);
  assert.throws(()=>validatePillarProposal({...proposal,connections:[],parent_pillars:[]},OCEAN_PILLARS),/pillar_proposal_requires_links/);
  assert.throws(()=>validatePillarProposal({...proposal,focus:['only one']},OCEAN_PILLARS),/invalid_pillar_proposal_focus/);
});

test('new Ocean proposals require a new valid key, pillar, mission and focus',()=>{
  const proposal={
    proposed_ocean_key:'seasonal-room-scent-gifting',
    display_name:'Seasonal Room Scent & Gifting',
    pillar_key:'scent-product-formulation',
    mission:'Investigar ocasiões sazonais em que uma experiência aromática possa ser descoberta, oferecida ou combinada com outros produtos.',
    focus:['datas e ocasiões','aromas de oferta','conjuntos e apresentação'],
    connections:['home-fragrance','supplier-intelligence','emotional-gifting']
  };
  const clean=validateOceanProposal(proposal,OCEAN_CATALOG);
  assert.equal(clean.ocean_key,proposal.proposed_ocean_key);
  assert.deepEqual(clean.connections,proposal.connections);
  assert.throws(()=>validateOceanProposal({...proposal,proposed_ocean_key:'brand-tom-ford'},OCEAN_CATALOG),/ocean_proposal_key_exists/);
  assert.throws(()=>validateOceanProposal({...proposal,pillar_key:'unknown-pillar'},OCEAN_CATALOG),/invalid_ocean_proposal_pillar/);
  assert.throws(()=>validateOceanProposal({...proposal,focus:['only one']},OCEAN_CATALOG),/invalid_ocean_proposal_focus/);
});

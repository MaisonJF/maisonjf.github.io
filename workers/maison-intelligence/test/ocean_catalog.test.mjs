import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OCEAN_CATALOG,
  OCEAN_CATALOG_VERSION,
  OCEAN_PILLARS,
  isFoundationalOceanKey,
  isValidOceanKey,
  selectOceanFocus,
  validateOceanProposal
} from '../src/ocean_catalog.js';

test('foundational Ocean catalogue has unique, valid keys and covers every pillar',()=>{
  assert.match(OCEAN_CATALOG_VERSION,/^JF-OCEANS-/);
  assert.ok(OCEAN_PILLARS.length>=11);
  assert.ok(OCEAN_CATALOG.length>=100);
  const keys=OCEAN_CATALOG.map(ocean=>ocean.ocean_key);
  assert.equal(new Set(keys).size,keys.length,'Ocean keys must be unique');
  for(const ocean of OCEAN_CATALOG){
    assert.ok(isValidOceanKey(ocean.ocean_key),ocean.ocean_key);
    assert.ok(ocean.display_name.length>=3,ocean.ocean_key);
    assert.ok(ocean.mission.length>=20,ocean.ocean_key);
    assert.ok(OCEAN_PILLARS.some(pillar=>pillar.key===ocean.pillar_key),ocean.ocean_key);
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
    'proven-aroma-formulas','supplier-intelligence','unexplored-territories'
  ]){
    assert.ok(isFoundationalOceanKey(key),key);
  }
  const firstSeries=OCEAN_CATALOG.find(ocean=>ocean.ocean_key==='first-thirteen-book-cycle');
  assert.match(firstSeries.mission,/12 livros e um 13.º volume/);
  const feral=OCEAN_CATALOG.find(ocean=>ocean.ocean_key==='brand-voice-feral-frontality');
  assert.match(feral.mission,/irreverência/);
  assert.match(feral.mission,/sem copiar/);
});

test('focus selection covers all pillars, returns only valid Ocean cross-links, and rotates brand study',()=>{
  const first=selectOceanFocus({runKey:'2026-10-27:03:00:openrouter-a',limit:16});
  const second=selectOceanFocus({runKey:'2026-10-27:15:00:openrouter-b',limit:16});
  assert.equal(first.length,16);
  assert.equal(second.length,16);
  for(const pillar of OCEAN_PILLARS){
    assert.ok(first.some(ocean=>ocean.pillar_key===pillar.key),pillar.key);
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

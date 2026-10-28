import fs from 'node:fs';
import { OCEAN_CATALOG, OCEAN_PILLARS, OCEAN_CATALOG_VERSION } from '../../../workers/maison-intelligence/src/ocean_catalog.js';

const ROOT = new URL('.', import.meta.url);
const OUTPUT = new URL('ocean-catalog.generated.json', ROOT);
const payload = {
  schema_version: 'maison_ocean_network_catalog_v1',
  catalog_version: OCEAN_CATALOG_VERSION,
  generated_from: 'workers/maison-intelligence/src/ocean_catalog.js',
  principle: 'Every Ocean is an individual knowledge territory. Pillars organize the graph; cross-links let relevant knowledge travel across the whole Maison Brain and, through private opt-in routing, founder growth.',
  expansion_contract: {
    dynamic_pillars_supported: true,
    dynamic_oceans_supported: true,
    human_approval_required: true,
    public_publication_by_default: false,
    relevance_routing_not_forced: true,
    graph_edges_preserve_source_identity: true
  },
  summary: {
    foundational_pillars: OCEAN_PILLARS.length,
    foundational_oceans: OCEAN_CATALOG.length,
    individual_brand_oceans: OCEAN_CATALOG.filter(ocean => ocean.ocean_key.startsWith('brand-')).length,
    ocean_to_ocean_edges: OCEAN_CATALOG.reduce((n, ocean) => n + (ocean.connections || []).length, 0),
    pillar_to_pillar_edges: OCEAN_PILLARS.reduce((n, pillar) => n + (pillar.connections || []).length, 0)
  },
  pillars: OCEAN_PILLARS.map(pillar => ({
    ...pillar,
    connections: [...(pillar.connections || [])],
    lifecycle_state: 'open',
    origin: 'foundational_catalog'
  })),
  oceans: OCEAN_CATALOG.map(ocean => ({
    ...ocean,
    focus: [...(ocean.focus || [])],
    connections: [...(ocean.connections || [])],
    lifecycle_state: ocean.lifecycle_state || 'open',
    origin: ocean.origin || 'foundational_catalog',
    visibility: 'internal'
  }))
};
const output = JSON.stringify(payload, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
  if (current !== output) {
    console.error('ocean-catalog.generated.json is stale; run build_ocean_catalog_snapshot.mjs');
    process.exit(1);
  }
  console.log('Ocean network catalog snapshot: OK · ' + payload.summary.foundational_pillars + ' pillars · ' + payload.summary.foundational_oceans + ' Oceans');
} else {
  fs.writeFileSync(OUTPUT, output);
  console.log('Wrote Ocean network catalog snapshot: ' + payload.summary.foundational_pillars + ' pillars · ' + payload.summary.foundational_oceans + ' Oceans · ' + payload.summary.ocean_to_ocean_edges + ' Ocean-to-Ocean edges');
}

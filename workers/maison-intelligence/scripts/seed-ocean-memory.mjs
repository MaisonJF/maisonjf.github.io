import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const source=JSON.parse(fs.readFileSync(path.join(ROOT,'.github/maison-growth/oceans/candidates.json'),'utf8'));
const candidates=Array.isArray(source.candidates)?source.candidates:[];

function sqlString(value){
  if(value==null) return 'NULL';
  return "'" + String(value).replaceAll("'","''") + "'";
}
function iso(value,fallback){
  if(!value) return fallback;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?fallback:d.toISOString();
}
const now=new Date().toISOString();
const lines=[];
for(const row of candidates){
  const key=String(row.territory||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._:-]{1,159}$/.test(key)) continue;
  const first=iso(row.firstSeenAt,now);
  const last=iso(row.lastSeenAt,first);
  const evidenceCount=Array.isArray(row.evidence)?row.evidence.length:0;
  const themes=JSON.stringify(Array.isArray(row.questionThemeCandidates)?row.questionThemeCandidates:[]);
  const adjacency=JSON.stringify(row.commercialAdjacency?[row.commercialAdjacency]:[]);
  const summary=String(row.painLanguage||'').slice(0,4000);
  lines.push(`
INSERT INTO ocean_memory_state
  (ocean_key,canonical_ocean_id,lifecycle_state,signal_count,independent_evidence_count,
   max_relevance_score,max_commercial_score,latest_summary,latest_theme_candidates_json,
   latest_commercial_adjacency_json,first_seen_at,last_seen_at,promotion_gate_state,snapshot_state,updated_at)
VALUES (
  ${sqlString(key)},${sqlString(key)},'existing',0,${Math.max(0,evidenceCount)},
  0,0,${sqlString(summary)},${sqlString(themes)},${sqlString(adjacency)},
  ${sqlString(first)},${sqlString(last)},'observe','synced',${sqlString(now)}
)
ON CONFLICT(ocean_key) DO UPDATE SET
  canonical_ocean_id=COALESCE(ocean_memory_state.canonical_ocean_id,excluded.canonical_ocean_id),
  independent_evidence_count=MAX(ocean_memory_state.independent_evidence_count,excluded.independent_evidence_count),
  latest_summary=CASE WHEN ocean_memory_state.latest_summary='' THEN excluded.latest_summary ELSE ocean_memory_state.latest_summary END,
  first_seen_at=MIN(ocean_memory_state.first_seen_at,excluded.first_seen_at),
  last_seen_at=MAX(ocean_memory_state.last_seen_at,excluded.last_seen_at),
  updated_at=excluded.updated_at;`);
}
process.stdout.write(lines.join('\n')+'\n');

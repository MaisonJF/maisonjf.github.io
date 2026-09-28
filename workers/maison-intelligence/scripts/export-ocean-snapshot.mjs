import fs from 'node:fs';

const [feedPath,snapshotPath]=process.argv.slice(2);
if(!feedPath||!snapshotPath) throw new Error('usage: node export-ocean-snapshot.mjs <feed.json> <candidates.json>');
const feed=JSON.parse(fs.readFileSync(feedPath,'utf8'));
const current=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
if(feed.kind!=='ocean_snapshot_feed'||feed.storage!=='D1') throw new Error('invalid_ocean_snapshot_feed');
const existing=new Map((current.candidates||[]).map(x=>[x.territory,x]));
const synced=[];
const uniq=xs=>[...new Set(xs.filter(Boolean))];
for(const row of feed.rows||[]){
  const prior=existing.get(row.ocean_key)||{};
  const signals=row.signals||[];
  const evidence=uniq(signals.flatMap(x=>x.evidence_roots||[]));
  const themes=uniq([
    ...(prior.questionThemeCandidates||[]),
    ...signals.flatMap(x=>x.theme_candidates||[]),
    ...JSON.parse(row.latest_theme_candidates_json||'[]')
  ]);
  const adjacency=uniq([
    ...(Array.isArray(prior.commercialAdjacency)?prior.commercialAdjacency:[prior.commercialAdjacency].filter(Boolean)),
    ...signals.flatMap(x=>x.commercial_adjacency||[]).map(x=>typeof x==='string'?x:JSON.stringify(x)),
    ...JSON.parse(row.latest_commercial_adjacency_json||'[]').map(x=>typeof x==='string'?x:JSON.stringify(x))
  ]);
  existing.set(row.ocean_key,{
    ...prior,
    territory:row.ocean_key,
    painLanguage:prior.painLanguage||row.latest_summary,
    intent:prior.intent||row.latest_summary,
    commercialAdjacency:adjacency.join('; '),
    evidence:uniq([...(prior.evidence||[]),...evidence]),
    questionPotential:prior.questionPotential??themes.length>0,
    questionThemeCandidates:themes,
    oraclePotential:prior.oraclePotential??false,
    status:prior.status||'internal_candidate',
    firstSeenAt:prior.firstSeenAt||row.first_seen_at,
    lastSeenAt:row.last_seen_at||prior.lastSeenAt
  });
  synced.push(row.ocean_key);
}
current.version=new Date().toISOString().slice(0,10);
current.last_enriched_at=new Date().toISOString();
current.candidates=[...existing.values()];
fs.writeFileSync(snapshotPath,JSON.stringify(current,null,2)+'\n');
process.stdout.write(JSON.stringify({synced,count:synced.length}));

import fs from 'node:fs';
import assert from 'node:assert/strict';

const robots=fs.readFileSync('robots.txt','utf8');
const policy=JSON.parse(fs.readFileSync('.github/maison-growth/brain/crawler-policy.json','utf8'));

function groups(text){
  const out=[];
  let current=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,'').trim();
    if(!line)continue;
    const m=line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if(!m)continue;
    const key=m[1].toLowerCase(), value=m[2].trim();
    if(key==='user-agent'){
      current={agents:[value],directives:[]};
      out.push(current);
    }else if(current){
      current.directives.push({key,value});
    }
  }
  return out;
}

const parsed=groups(robots);
function groupFor(agent){
  return parsed.find(group=>group.agents.some(value=>value.toLowerCase()===agent.toLowerCase()));
}
function permitsRoot(group){
  if(!group)return false;
  const rootDisallow=group.directives.some(d=>d.key==='disallow'&&(d.value==='/'||d.value==='/*'));
  const rootAllow=group.directives.some(d=>d.key==='allow'&&d.value==='/');
  return rootAllow&&!rootDisallow;
}

assert.equal(policy.schema_version,'maison_crawler_discovery_policy_v1');
const wildcard=groupFor('*');
assert(wildcard&&permitsRoot(wildcard),'robots.txt must keep generic root crawl access');

for(const bot of policy.search_discovery_required){
  assert.equal(bot.required_root_access,true,bot.user_agent+': policy must require root access');
  const group=groupFor(bot.user_agent);
  assert(group,bot.user_agent+': explicit robots group missing');
  assert(permitsRoot(group),bot.user_agent+': root discovery access is not explicitly allowed');
  assert(Array.isArray(bot.cloudflare_detection_ids)&&bot.cloudflare_detection_ids.length>0,bot.user_agent+': verified detection ids missing');
}

for(const sitemap of policy.sitemap_requirements){
  assert(robots.includes('Sitemap: '+sitemap),'robots.txt missing sitemap '+sitemap);
}

// Search SEO must never silently decide training policy.
for(const bot of policy.nonsearch_separate_decision){
  assert(
    bot.seo_guard_does_not_choose_allow_or_block===true ||
    bot.seo_guard_does_not_require_robots_rule===true,
    bot.user_agent+': non-search boundary missing'
  );
}

const ids=policy.search_discovery_required.flatMap(bot=>bot.cloudflare_detection_ids);
assert.equal(new Set(ids).size,ids.length,'Cloudflare detection ids must not collide across configured discovery bots');

console.log(
  'MAISON crawler discovery policy: OK · '+
  policy.search_discovery_required.length+' explicit search/discovery bots · '+
  policy.sitemap_requirements.length+' sitemaps'
);

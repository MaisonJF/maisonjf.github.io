import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {crawlerIndex,summariseCrawlerGroups} from '../brain/audit_cloudflare_crawlers.mjs';

const policy=JSON.parse(fs.readFileSync('.github/maison-growth/brain/crawler-policy.json','utf8'));

test('crawler policy exposes unique verified detection ids',()=>{
  const index=crawlerIndex(policy);
  assert.ok(index.size>=9);
  assert.equal(index.get(126255384).user_agent,'OAI-SearchBot');
  assert.equal(index.get(33564301).user_agent,'Claude-SearchBot');
  assert.equal(index.get(33563889).user_agent,'PerplexityBot');
});

test('crawler aggregation counts only verified configured discovery bots',()=>{
  const rows=summariseCrawlerGroups(policy,[
    {count:12,dimensions:{botDetectionIds:[126255384],clientRequestHTTPHost:'maison-jf.com'}},
    {count:4,dimensions:{botDetectionIds:[33564301],clientRequestHTTPHost:'maison-jf.com'}},
    {count:3,dimensions:{botDetectionIds:[999999999],clientRequestHTTPHost:'maison-jf.com'}},
    {count:2,dimensions:{botDetectionIds:[117479730,33554461],clientRequestHTTPHost:'www.maison-jf.com'}}
  ]);
  const byAgent=Object.fromEntries(rows.map(row=>[row.user_agent,row]));
  assert.equal(byAgent['OAI-SearchBot'].requests,12);
  assert.equal(byAgent['Claude-SearchBot'].requests,4);
  assert.equal(byAgent['Bingbot'].requests,2);
  assert.equal(byAgent['PerplexityBot'].requests,0);
  assert.deepEqual(byAgent['Bingbot'].hosts,['www.maison-jf.com']);
});

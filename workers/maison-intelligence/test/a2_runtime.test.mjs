import test from 'node:test';
import assert from 'node:assert/strict';
import {
  A2RuntimeError,
  normalizeA2Event,
  persistA2Event,
  handleA2IngestRequest
} from '../src/a2_runtime.js';

function b2b(overrides={}){
  return {
    contract_version:1,
    source:'commerce',
    event_type:'b2b.lead',
    occurred_at:'2026-09-25T12:00:00Z',
    idempotency_key:'b2b:lead:test-001',
    privacy_class:'pseudonymous',
    metadata:{interest:'b2b',origin:'professional_test',business:'spa',...overrides}
  };
}

class FakeD1 {
  constructor(){this.events=new Map();this.registry=new Map();}
  prepare(sql){
    const db=this;
    return {
      bind(...args){
        return {
          sql,args,
          first:async()=>db.first(sql,args),
          run:async()=>db.run(sql,args)
        };
      }
    };
  }
  async batch(statements){
    for(const stmt of statements)await stmt.run();
    return statements.map(()=>({success:true}));
  }
  async first(sql,args){
    if(sql.includes('FROM events WHERE source=')){
      return this.events.get(`${args[0]}|${args[1]}`)||null;
    }
    if(sql.includes('FROM events WHERE event_id=')){
      return [...this.events.values()].find(x=>x.event_id===args[0])||null;
    }
    if(sql.includes('FROM idempotency_registry')){
      return this.registry.get(`${args[0]}|${args[1]}`)||null;
    }
    throw new Error('unexpected select');
  }
  async run(sql,args){
    if(sql.includes('INSERT INTO events')){
      const row={
        event_id:args[0],idempotency_key:args[1],event_type:args[2],source:args[3],
        payload_hash:args[12]
      };
      this.events.set(`${row.source}|${row.idempotency_key}`,row);
      return {success:true};
    }
    if(sql.includes('INSERT INTO idempotency_registry')){
      this.registry.set(`${args[0]}|${args[1]}`,{object_id:args[2],payload_hash:args[3]});
      return {success:true};
    }
    throw new Error('unexpected write');
  }
}

test('canonical A2 runtime accepts B2B lead contract',()=>{
  const out=normalizeA2Event(b2b());
  assert.equal(out.source,'commerce');
  assert.equal(out.event_type,'b2b.lead');
  assert.equal(out.metadata.business,'spa');
});

test('B2B event-specific metadata is deny-by-default',()=>{
  assert.throws(
    ()=>normalizeA2Event(b2b({b2b_stage:'lead'})),
    error=>error instanceof A2RuntimeError&&error.code==='metadata_not_allowed_for_event'
  );
  const proposal=b2b();
  proposal.event_type='b2b.proposal';
  proposal.idempotency_key='b2b:proposal:test-001';
  proposal.metadata={offer_family:'gifting'};
  assert.throws(
    ()=>normalizeA2Event(proposal),
    error=>error instanceof A2RuntimeError&&error.code==='required_metadata_missing'
  );
});

test('Content observations stay aggregated and non-economic',()=>{
  const out=normalizeA2Event({
    contract_version:1,
    source:'maison-content-distribution',
    event_type:'content.performance_observed',
    occurred_at:'2026-09-29T12:00:00Z',
    idempotency_key:'content:performance:test-001',
    privacy_class:'aggregated',
    metadata:{
      content_id:'cnt-piece-001',
      channel:'instagram_reels',
      platform:'instagram',
      surface:'reels',
      format:'short_video',
      reach:1200,
      link_clicks:84,
      click_rate_bps:700,
      source_refs_hash:'a'.repeat(64),
      manual_distribution_confirmed:true
    }
  });
  assert.equal(out.privacy_class,'aggregated');
  assert.equal(out.metadata.reach,1200);
  assert.equal('economic_value_minor' in out.metadata,false);
});

test('SOS aggregate is accepted without operational identity',()=>{
  const out=normalizeA2Event({
    contract_version:1,
    source:'sos_product',
    event_type:'sos.aggregate',
    occurred_at:'2026-09-25T23:59:59.999Z',
    idempotency_key:'sos-daily:2026-09-25:paused:not_applicable:0.1.0',
    privacy_class:'aggregated',
    metadata:{
      product_id:'sos-maison-jf',
      signal_kind:'paused',
      cadence_bucket:'daily',
      delivery_outcome:'not_applicable',
      product_version:'0.1.0-foundation',
      count:3
    }
  });
  assert.equal(out.metadata.signal_kind,'paused');
  assert.equal(out.metadata.count,3);
});

test('direct PII is rejected before persistence',()=>{
  assert.throws(
    ()=>normalizeA2Event(b2b({origin:'person@example.com'})),
    error=>error instanceof A2RuntimeError&&error.code==='privacy_violation'
  );
});

test('persistence is idempotent and detects conflicting reuse',async()=>{
  const db=new FakeD1();
  const first=await persistA2Event(db,normalizeA2Event(b2b()));
  const duplicate=await persistA2Event(db,normalizeA2Event(b2b()));
  assert.equal(first.status,'accepted');
  assert.equal(duplicate.status,'duplicate');
  assert.equal(duplicate.event_id,first.event_id);

  const changed=b2b({business:'hotel'});
  await assert.rejects(
    ()=>persistA2Event(db,normalizeA2Event(changed)),
    error=>error instanceof A2RuntimeError&&error.code==='idempotency_conflict'
  );
});

test('private ingest endpoint is disabled by default',async()=>{
  const request=new Request('https://brain.maison-jf.com/internal/a2/ingest',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(b2b())
  });
  const res=await handleA2IngestRequest(request,{});
  assert.equal(res.status,404);
});

test('private ingest endpoint requires its own token',async()=>{
  const request=new Request('https://brain.maison-jf.com/internal/a2/ingest',{
    method:'POST',
    headers:{'content-type':'application/json','authorization':'Bearer wrong'},
    body:JSON.stringify(b2b())
  });
  const res=await handleA2IngestRequest(request,{
    A2_INGEST_API_ENABLED:'true',
    A2_INGEST_TOKEN:'correct',
    GROWTH_DB:new FakeD1()
  });
  assert.equal(res.status,401);
});

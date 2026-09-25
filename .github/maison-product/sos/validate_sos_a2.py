#!/usr/bin/env python3
import json
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
A2=HERE.parents[1]/'maison-growth'/'a2'
sys.path.insert(0,str(A2))
from collector import normalize_ingestion, PrivacyViolation  # noqa: E402

registry=json.loads((A2/'source-registry.json').read_text(encoding='utf-8'))
raw={
    'contract_version':1,
    'source':'sos_product',
    'event_type':'sos.aggregate',
    'occurred_at':'2026-09-25T23:59:59.999Z',
    'idempotency_key':'sos-daily:2026-09-25:checkin_completed:not_applicable:0.1.0-foundation',
    'privacy_class':'aggregated',
    'metadata':{
        'product_id':'sos-maison-jf',
        'signal_kind':'checkin_completed',
        'cadence_bucket':'daily',
        'delivery_outcome':'not_applicable',
        'product_version':'0.1.0-foundation',
        'count':42,
    },
}
normalized=normalize_ingestion(raw,source_registry=registry)
assert normalized['source']=='sos_product'
assert normalized['privacy_class']=='aggregated'
assert normalized['metadata']['count']==42

bad=json.loads(json.dumps(raw))
bad['metadata']['email']='person@example.com'
try:
    normalize_ingestion(bad,source_registry=registry)
    raise AssertionError('SOS direct PII must be rejected by canonical A2')
except PrivacyViolation:
    pass

bad2=json.loads(json.dumps(raw))
bad2['metadata']['account_ref']='sua_'+'a'*36
try:
    normalize_ingestion(bad2,source_registry=registry)
    raise AssertionError('SOS pseudonymous account IDs are not allowlisted')
except Exception as exc:
    assert 'not allowlisted' in str(exc)

print('SOS -> canonical A2 contract: OK')

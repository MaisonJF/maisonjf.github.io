# A11 runtime boundary

A11 is fully testable with deterministic fixtures and SQLite stubs.

Not activated:
- Cloudflare Worker, Queue or D1;
- live feeds from production journeys, conversions, experiments or promotion runs;
- external model/embedding provider;
- production credentials or public repository write permissions.

Future runtime validation must cover:
1. durable ingestion from A3/A7/A8/A10 tables;
2. idempotent concurrent learning runs in D1;
3. late-arriving or corrected outcome facts;
4. scale/latency and retry behavior;
5. live economic outcomes over meaningful time windows;
6. model/provider version pinning if an external model is later introduced.

Runtime failure must never affect the public Maison site.

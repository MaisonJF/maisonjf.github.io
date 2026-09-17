# A5 runtime boundary

A5 completes at repository level without Cloudflare runtime or an external semantic model.

Deferred integration tests:

- D1 concurrency and transaction behaviour with A5 tables;
- Worker/Queue scheduling and retries;
- live A4 Radar feeds producing privacy-reviewed semantic observations;
- external model/embedding adapter latency, quotas, deterministic version capture and failure handling;
- production-scale clustering performance.

Failure of any future A5 runtime must only stop/defer analysis. It must not block the public Maison site, Oráculo, products, ebooks, checkout or public functions.

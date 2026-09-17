# A8 runtime boundary

No Cloudflare Worker, Queue, D1 database, binding, credential, scheduler or public endpoint is provisioned by A8.

Repository validation uses deterministic local simulations and SQLite dependency stubs.

Future runtime work still needs to validate:
- transactional concurrency for compatibility claims and exposure idempotency;
- real D1 latency/locking and retry behavior;
- live metric ingestion from A2/A3;
- live decision references from A7;
- protected internal authentication/authorization;
- eventual Publisher Gateway execution of an approved experiment/rollback.

If the whole Experiment Manager is unavailable, the public Maison must continue normally.

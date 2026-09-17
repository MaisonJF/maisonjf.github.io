# Cloudflare activation boundary

Nothing in A2 provisions or changes Cloudflare resources.

When runtime activation is approved later, the expected mapping is:

1. a private/controlled collector Worker implements the A2 ingestion contract;
2. a Queue may buffer validated events;
3. a dedicated Growth D1 uses the A1 migrations;
4. Queue retry/DLQ behavior follows `retry-policy.json`;
5. no public Maison page/function depends synchronously on collector availability.

Required checks before activation:

- provision D1 from A1;
- apply A1 migrations;
- create Worker/Queue only with explicit approval;
- bind only the Growth resources;
- keep public commerce/Oracle runtimes independent;
- test collector outage while public Maison remains healthy;
- test Queue duplicate delivery and D1 idempotency;
- test DLQ contains no raw rejected PII payload;
- test no `oracle.content.read` capability exists.

A2 repository work does not require any of these resources to exist.

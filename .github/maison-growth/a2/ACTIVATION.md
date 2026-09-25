# Cloudflare activation boundary

A2 now has a **private runtime implementation** inside the existing `maison-intelligence` Worker.

It remains **disabled by default** and does not expose a public ingestion endpoint.

## Implemented, not activated

- private route: `/internal/a2/ingest`;
- host: existing `maison-intelligence` Worker;
- storage: existing canonical `GROWTH_DB`;
- source policy: generated from the canonical `source-registry.json`;
- authentication: dedicated bearer secret `A2_INGEST_TOKEN`;
- activation flag: `A2_INGEST_API_ENABLED`, committed as `false`;
- persistence: A1 `events` + `idempotency_registry` only;
- rejected raw PII is never persisted;
- no public Maison page depends synchronously on A2.

The runtime code may be deployed while remaining unreachable because the activation flag is false.

## Activation checklist

Activation is a separate operational decision. Before setting `A2_INGEST_API_ENABLED=true`:

1. verify the canonical Growth D1 contains the current A1 schema;
2. verify the generated Worker registry is in sync with `source-registry.json`;
3. create/install a dedicated `A2_INGEST_TOKEN` secret;
4. run duplicate-delivery and idempotency-conflict tests against a controlled environment;
5. verify rejected PII leaves no raw payload in events, logs or dead-letter storage;
6. verify public site, commerce, Oracle and SOS flows remain healthy while A2 is unavailable;
7. verify each producer is fail-open/asynchronous with respect to analytics ingestion;
8. only then enable the private route.

A Queue can later buffer **already validated, PII-free** normalized events. It is optional for the first private runtime and must never become a place where rejected raw payloads are stored.

Brain execution authority and the Brain database kill switch are independent from A2 ingestion. Enabling A2 must not enable autonomous Brain execution.

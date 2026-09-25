# A2 · Event Collector

A2 is the isolated ingestion boundary for the Maison Growth Engine.

It does **not** expose a public HTTP endpoint, modify the Maison site, or become a dependency of any public runtime. A private implementation now exists at `/internal/a2/ingest` inside the existing `maison-intelligence` Worker, but it is committed **disabled by default** and requires a dedicated secret plus explicit activation. The public Maison must remain fully operational if A2 is absent.

## Pipeline

`raw source event → contract/version check → source allowlist → privacy scan → normalization → A1 event envelope → idempotent event store`

The collector uses ports/adapters:

- `EventCollector` owns validation and normalization.
- `MemoryEventStore` supports deterministic unit tests.
- `SQLiteA1EventStore` proves compatibility with the A1 D1/SQLite schema.
- The private Cloudflare Worker adapter implements the same validation, privacy, idempotency and A1 persistence semantics.
- Its source registry is generated from the canonical `source-registry.json`; CI rejects manual drift.
- A Queue remains optional and, if added, may only receive already validated PII-free normalized events.

## Deny by default

Unknown sources, top-level fields and source metadata fields are rejected. Direct PII, commercial identifiable information, raw free text not explicitly reviewed, and paid Oracle content are rejected before persistence.

Commercial systems remain the system of record for identifiable customer data. The Growth Engine receives only anonymous, pseudonymous or aggregated signals allowed by the source contract.

## Idempotency

The end-to-end key is `(source, idempotency_key)`.

- same key + same canonical payload → returns the original event as `duplicate`;
- same key + different payload → permanent `idempotency_conflict`;
- the A1 `idempotency_registry` is written in the same local transaction as the event.

## Failure handling

Permanent validation/privacy/version failures are not retried and their raw payloads are never dead-lettered. Only a sanitized fingerprint/reason may be logged.

Transient storage/transport failures use the prepared backoff policy. After exhaustion, only a **validated, PII-free normalized event** may enter a future DLQ.

See `retry-policy.json`.

## Run locally

From this directory:

```bash
python3 validate_a2.py
```

The validator executes the automatic test suite and checks A0/A1 isolation contracts. No network access or Cloudflare resource is required.

## Activation boundary

A2 is repository-complete before runtime activation. The private runtime code is implemented but disabled. Activation requires the reviewed steps in `ACTIVATION.md`, a dedicated secret, and must not create a hard dependency from the public site.

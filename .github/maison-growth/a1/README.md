# Maison Growth Engine — A1 Data Foundation

A1 is an **internal-only** data foundation. It does not add a public endpoint, change a public page, alter checkout, modify redirects/sitemaps, or make the public Maison depend on Growth infrastructure.

## Included

- D1/SQLite-compatible canonical schema and migration 0001.
- Stable prefixed UUIDv7 identifier contract.
- Immutable `events` foundation with source-scoped idempotency.
- Append-only `audit_log`.
- Immutable rule/model version registries.
- General idempotency registry.
- Explicit deny-by-default data permissions.
- Event envelope v2 for the future Event Collector.
- Local automatic validator covering schema, constraints, idempotency, foreign keys and immutability.

## Runtime boundary

No D1 resource or binding is created by A1 in the repository. Provisioning is intentionally deferred until authorised. Absence or failure of the future Growth D1 must never break the public Maison.

## Validation

Run:

```bash
python3 .github/maison-growth/validate_a0.py
python3 .github/maison-growth/a1/validate_a1.py
```

A1 is repository-complete when both validators pass and the PR only changes internal Growth contract files. Runtime activation still requires creation of the dedicated D1 database and application of migration `0001_data_foundation.sql`.

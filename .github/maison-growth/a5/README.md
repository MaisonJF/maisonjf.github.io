# A5 · Cérebro

A5 is an isolated, analysis-only layer above A4 Mapa Vivo + Radar. It normalizes privacy-reviewed language signals, groups equivalent language, records aliases/deduplication, resolves coverage, identifies real gaps and creates **internal candidates as data only**.

## Hard boundary

A5 cannot create HTML, URLs, sitemaps, IndexNow submissions, navigation, CTAs, products or catalogue changes. It has no public-site or repository-write capability. A future Publisher Gateway remains the only permitted public-writing path.

## Explainability

Every persisted conclusion stores reason codes, evidence references when available, input hash, rule version and model/provider version. Confidence is a separate numeric fact; it never acts as permission to publish.

## Semantic provider

Repository validation uses `DeterministicSemanticProvider`, backed by the versioned `brain-policy.json`. A future embeddings/model adapter may replace or complement it without changing the Brain contract. External semantic services are not provisioned by A5.

## Privacy

Only privacy-reviewed language may enter semantic processing. Direct PII, commercial identity and paid Oráculo content are rejected. Oráculo can contribute aggregate/structured A4 evidence, never paid reading text.

## Runtime

The migration is D1/SQLite compatible but no Worker, Queue, D1 or binding is created here. The Maison public runtime remains independent if the entire Growth Engine is absent.

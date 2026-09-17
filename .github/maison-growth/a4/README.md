# A4 · Mapa Vivo Core + Radar

A4 is an **analysis-only** layer. It maps needs, intents, assets and existing A3 solutions, stores privacy-safe evidence, derives deterministic coverage states and accepts Radar signals from A2-normalized sources.

It cannot publish, edit the site, modify CTAs, create products, change checkout or read paid Oracle content.

## Core entities
- `needs`: normalized human needs.
- `intents`: distinct intents under a need, deduplicated by semantic fingerprint.
- `assets`: known public/internal Maison discovery assets.
- A3 `solutions`: existing approved solutions; A4 only reads/links them.
- relation tables: need/intent ↔ asset/solution.
- `map_evidence`: privacy-safe supporting evidence.
- `coverage_assessments`: `none`, `partial`, `sufficient`.
- `coverage_gaps`: content/solution/journey/positioning gaps.
- `radar_signals`: source-normalized demand/engagement/conversion/solution-usage observations.

## Coverage
`coverage_v1` is deterministic. No active relation = `none`; active relations below 80 = `partial`; at least one active relation at 80+ = `sufficient`. Overall state is `covered` only when both public and solution coverage are sufficient, `gap` only when both are none, and `partial` otherwise. `future_candidate` is never inferred automatically in A4.

## Radar boundary
A4 does not fetch GSC, site analytics, Teste, Oráculo or commerce directly. Future source adapters authenticate outside this module, emit the A2 normalized event contract, then A4 accepts only allowlisted structured facts. Raw GSC query text, direct commercial identity and paid Oráculo text are forbidden. Signals that cannot be linked to a known need/intent remain evidence without forcing a semantic match.

## A3 compatibility
A4 may carry pseudonymous `journey_id` and `solution_id` links and may copy deterministic A3 economic facts such as realised revenue, immediate contribution, human effort, scalability, repeatability and confidence. Missing economic values remain unknown; A4 never invents them.

## Runtime deferred
No Worker, Queue, D1 binding or external credential is provisioned by A4. The migration and repository adapter are D1/SQLite-compatible and can be connected later without making the public Maison site depend on them.

## Important
A4 may record a `future_candidate`, but that is an internal state only. No content generation, public URL creation, CTA experiment, catalogue mutation or publication path exists in this module.

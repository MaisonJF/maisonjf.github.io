# MAISON JF® · Private Brain Vault

This directory contains only the **public schema and operating contract** for the private Maison content vault. Paid question bodies and paid Oráculo blocks remain in Cloudflare D1 and must never be committed to this public repository.

## Runtime

Cloudflare Pages Functions use the D1 binding:

`MAISON_BRAIN_DB`

Buyer identity for anti-repetition is HMAC-pseudonymised server-side with:

`MAISON_VAULT_PEPPER`

Raw email addresses, answer text and private conversation content are not part of the vault contract.

## Migrations

Apply migrations in order:

1. `0001_private_content_vault.sql`
2. `0002_experience_engine.sql`

Migration v2 changes `vault_meta.schema_version` to `vault_v2`. Runtime code checks this marker before using v2-only columns or tables.

The production Oráculo is deliberately backward-compatible: if v2 is not present, if there are not enough approved live blocks, or if the compositional engine cannot produce a valid reading, the existing authored 28-reading system remains available.

## Architecture

The operating loop is:

`OCEANS → BRAIN → TAXONOMY GATE → EDITORIAL GATE → D1 → EXPERIENCE DIRECTOR → COMPOSER → QUALITY GATE → PRODUCT → SIGNALS → LEARNING → BRAIN`

Responsibilities are separated:

- **Oceans** discover human pain patterns and internal gaps. They never publish paid content.
- **Brain** clusters, deduplicates, classifies and proposes.
- **Taxonomy Gate** routes a candidate to new territory, subterritory or additional depth.
- **Editorial Gate** controls admission to the vault.
- **D1** stores approved private editorial intelligence and pseudonymous exposure history.
- **Experience Director** chooses the emotional trajectory before text is selected.
- **Composer** assembles compatible blocks/questions.
- **Quality Gate** rejects incoherent combinations before delivery.
- **Signals/Learning** inform distribution and gap detection without redefining editorial truth from engagement alone.

## Lifecycle

Content uses two independent axes.

Editorial lifecycle:

`candidate → lab → vault → live → review → retired`

Rotation state:

`new → limited → normal → review → retired`

New material therefore enters slowly. A block can be editorially approved while still having deliberately limited serving weight.

## Oráculo v2

Private blocks use the roles:

`opening → recognition → tension → counterpoint → reframe → movement → close`

A reading does not have to contain every role. The Experience Director selects one of a small number of coherent trajectories first; the Composer then selects compatible blocks for that route.

Selection considers quality, compatibility, trajectory fit, freshness, anti-repetition, rotation state and silent rarity. The browser receives only the final reading, never the private repertoire or scoring metadata.

## PÁRA DE IGNORAR!

A paid session remains:

**28 perguntas. Duas pessoas.**

The server composes two stable 14-card packs and now validates the full 28-question experience before returning it. V2 metadata can express target, emotional function, cognitive/emotional load, semantic fingerprint, compatibility and lifecycle state.

No answer text is requested or stored.

## Taxonomy and gap growth

`taxonomy-gate.js` prevents every wording variation from becoming a new territory. Candidates are routed to:

- `new_territory`
- `subterritory`
- `depth`

`content-gap-detector.js` detects minimum healthy coverage by role/stage. These values are **floors, never catalogue caps**. The purpose is to tell the Brain/Oceans where depth is missing instead of endlessly generating more of what is already abundant.

## Safety contract

- GitHub stores code/schema, not paid bodies.
- Browser clients never receive full repertoires.
- Question and Oracle bodies are versioned by inserting new IDs rather than silently rewriting historical content.
- Paid sessions keep selected content IDs so reloads remain stable.
- Buyer identity is pseudonymous and derived server-side.
- Answer text and private conversation text are never stored.
- Oceans can propose candidates and needs only; they cannot write directly into live paid tables.
- Metrics may alter distribution weights, but do not automatically redefine taxonomy or editorial truth.
- Quality failures are invisible to customers; the Composer retries or the legacy safe fallback is used.


## Production runtime guardrails (2026-09-19)

- Production D1 has been reconciled from the early partial vault and upgraded to `vault_v2`.
- PÁRA DE IGNORAR! uses the v2 question reader when the schema is ready; its paid checkout remains fixed at EUR 5.00 and the API verifies amount + currency.
- PDI interaction signals record only product events/IDs (served, advanced, passed, completed, repurchased). Answer text and private conversation content are never sent to the signal endpoint.
- Signal/gap-learning writes are fail-open: analytics or learning failures must never block a paid experience.
- Oracle composition starts only when a territory has active/live coverage for all seven editorial roles. Untouched or incomplete territories stay on the authored legacy reading system.
- `global` Oracle blocks may support an already-developed territory, but cannot by themselves switch an untouched territory to composition.
- Territory-specific Oracle blocks take precedence over global fallback blocks.
- Coverage gaps are written idempotently to `vault_content_needs`; they are evidence for Brain/Oceans, never automatic paid publication.


## Brain editorial queue

The internal file `.github/maison-growth/brain/editorial-queue.json` is the persisted hand-off between Ocean discovery and paid editorial work.

It contains **metadata and editorial hypotheses only**. It never stores paid question bodies, Oracle answer/reading bodies, private conversation text or personal data. Every entry requires human editorial approval and has automatic activation disabled.

The queue is rebuilt from `.github/maison-growth/oceans/candidates.json` with:

`node .github/maison-growth/brain/build_editorial_queue.mjs`

CI uses `--check` so a new or changed Ocean cannot silently drift away from the editorial queue.

The production health endpoint may expose aggregate catalogue counts and coverage needs only. It must never expose paid bodies or buyer-level data.

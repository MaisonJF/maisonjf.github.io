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
3. `0003_localized_content.sql`

Migration v2 changes `vault_meta.schema_version` to `vault_v2`. Migration v3 upgrades it to `vault_v3` and adds PT-BR/EN/ES renderings without duplicating canonical content identity. PT-PT remains the editorial source body; Brazilian Portuguese, English and Spanish live in translation tables keyed by the same question/block IDs. Existing sessions default to `pt-PT`.

The production Oráculo is deliberately backward-compatible in PT-PT: if v2/v3 composition is unavailable, incomplete or fails quality, the existing authored reading system remains available. PT-BR/EN/ES never fall back to Portuguese; a localized checkout is blocked until that locale has complete active coverage.

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

## Localized paid content

The multilingual contract is deliberately narrow:

`one canonical ID → PT-PT source + PT-BR rendering + EN rendering + ES rendering`

- Question logic, stage, intensity, scores, compatibility, metrics and session position belong to the canonical question ID.
- Oracle role, intensity, compatibility, metrics and session position belong to the canonical block ID.
- Only localized text/title changes by locale.
- Paid sessions persist the purchased locale so reloads cannot silently switch language.
- PT-BR/EN/ES content must be active before checkout; missing translations never fall back to PT-PT inside a paid experience.
- Future languages can be added as additional renderings without cloning the product logic.

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

`content-gap-detector.js` detects minimum healthy coverage by role/stage. These values are **floors, never catalogue caps**. Below a floor, real coverage gaps take priority. Once a floor is reached, the detector opens the next bounded depth milestone with `reason_code=continuous_depth`, so Brain/Oceans keep expanding mature territories without ever treating 300 questions, or any later milestone, as a final catalogue size.

## Continuous growth contract

The private catalogue is intentionally open-ended.

- PT-PT remains the canonical editorial source.
- Every mature question theme keeps receiving new depth milestones after its 300-question healthy floor.
- Every mature Oracle territory keeps receiving new role-depth milestones after its healthy role floors.
- There is no numeric hard cap: `catalogueCap=null` is emitted in growth needs.
- Real gaps outrank expansion work; continuous growth does not justify duplicate or low-quality content.
- New canonical IDs still pass taxonomy, semantic deduplication, ontology/editorial and quality gates before live serving.
- Each newly live canonical ID creates localization work for PT-BR, EN and ES, preserving one identity across languages.
- The goal is a continuously compounding private corpus: thousands, then tens of thousands of distinct canonical pieces, while session composition exposes only a tiny relevant subset.

## Volta Para Casa · Ocean/Vault question loop

The free Volta Para Casa tests are now consumers of the same intelligence loop without exposing the paid repertoire.

Runtime order:

`Ocean question signals → generated public signal bridge → VPC question engine → approved public_social Vault cards → balanced session → anonymous interaction signals`

Rules:

- Ocean candidates with `questionPotential=true` are mirrored into `functions/_lib/vpc-ocean-signals.generated.js`; CI refuses a stale mirror.
- The VPC engine also uses the 100 Oracle territories and Maison conversation seeds as safe thematic material, creating many session combinations without publishing private paid bodies.
- A live D1 question can join a free VPC session only when it is `status='active'`, `exposure='public_social'`, `lifecycle_state='live'` and its `product_fit_json.vpc.test` identifies `attention`, `apego` or `afeto`.
- Multiple-choice scoring metadata for a public VPC card lives under `product_fit_json.vpc.choices`; paid PÁRA DE IGNORAR! bodies remain under the existing private paid contract and are never reused automatically in free tests.
- The public browser receives only the composed session, never the full Vault repertoire.
- If D1 is unavailable or has no eligible VPC cards, the Ocean engine remains usable; if that endpoint fails too, the browser falls back to the curated local question bank.
- New Ocean signals expand the thematic pool, but they still pass deterministic structural/quality checks. Engagement can influence rotation later; it does not redefine editorial truth.

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

- Production D1 must be upgraded in order. The repository now defines `vault_v3`; until `0003_localized_content.sql` is applied remotely, PT-PT continues to work through the v2-compatible runtime and PT-BR/EN/ES remain unavailable.
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

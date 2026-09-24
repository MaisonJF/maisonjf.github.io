# Maison Technology Ledger

> **Canonical inventory for Maison JF technology, data sources and new capabilities.**
>
> Rule: **if a technology/source/capability is not in this Ledger, it has not entered the Maison project.**

## Governance

This Ledger exists so architecture decisions do not depend on chat memory.

Statuses:

- **AGORA** — approved direction or already being implemented.
- **DEPOIS** — wanted, but depends on earlier work or infrastructure.
- **EXPERIÊNCIA** — promising; must be tested before architectural commitment.
- **REJEITADO** — deliberately excluded for now, with the reason preserved.

Verification is separate from status. A tool can be strategically approved while its exact current licence, hosted free-tier or deployment requirements are still **PENDING_VERIFICATION**.

### Hard rules

1. Free/open-source/self-hosted/public-data first.
2. Paid services require a documented capability or ROI advantage.
3. External systems are sensors/tools, never Maison authority.
4. A13/D1 evidence and provenance remain canonical; derived indexes/memories must be rebuildable where possible.
5. Semantic similarity is not independent evidence.
6. A12 remains the central autonomy/risk/human-approval policy.
7. No public write, catalogue mutation, price change or product launch may bypass existing Maison gates.
8. Publicly accessible data does **not** automatically mean unrestricted reuse; copyright/licence/terms are verified per source.
9. New candidates are appended, not silently substituted for older decisions.
10. Rejected candidates stay recorded to avoid repeating the same architectural debate.

## Capability map

| Capability | Primary candidates |
|---|---|
| World sensing | OSIRIS OSINT, RSSHub, Crawl4AI, ChangeDetection |
| External AI sensors | Cloudflare Workers AI, OpenAI, Gemini, Perplexity, Anthropic, OpenRouter, Osiris AI Gateway |
| Web/public-source reading | Crawl4AI, RSSHub |
| Audio hearing | Faster-Whisper, YAMNet (experiment) |
| Visual understanding | local VLMs (experiment), aggregate CV detector (licence-safe candidate needed) |
| Pre-LLM analytics | DuckDB, Polars, GLiNER, Ruptures, clustering |
| Weak-signal convergence | Maison Pre-Brain + Ruptures + statistical fusion |
| Scientific sensing | OpenAlex, PubChem |
| Historical/editorial memory | Project Gutenberg, Standard Ebooks, Internet Archive, Europeana, Wikisource |
| Economic/B2B sensing | Eurostat, INE, BASE.gov.pt |
| Geographic intelligence | H3, DuckDB Spatial |
| Causal analysis | DoWhy |
| Semantic retrieval | Maison Semantic Memory contract; **pgvector first runtime backend**, Qdrant retained as experiment |
| Relational/agent memory | Osiris Memory pinned/private runtime; graph engine candidates only for proven gaps |
| Model routing | OpenRouter now; LiteLLM later; Osiris AI Gateway optional route |
| Tool protocol | MCP |
| Persistent private runtime | PostgreSQL/pgvector + Redis + pinned Osiris Memory + authenticated A13 bridge |
| Operational integrations | n8n later |
| Durable cognition/workflows | Cloudflare Workflows/Durable Objects, Hatchet/LangGraph experiments |
| Discovery | Maison Scout |
| Adversarial validation | Maison Critic |
| Product/IP generation | Maison Content & Product Foundry |
| Existing commercial assets | Generated products/services registry + optional private stock/cost/capacity overlay |
| Universal commercial opportunity + earned distribution | A14 Universal Opportunity + Earned Distribution |
| Human-approved validation planning | A14.3 validation planner → manual pilot or A7-gated A8 draft |
| CTA experiment draft planning | Explicit private CTA context + A7 `test_cta` + A8 draft-only writer |
| Canonical Brain read cycle | Brain Control API + A5 mapping + Pre-Brain/Scout/Critic/Foundry + A14 preview |
| Semantic projection ingestion | Manual allowlisted D1 → pgvector sync; rebuildable cursor |
| Commercial learning | A3 + A7 + A8 + A11 + A14 Opportunity/Insight attribution bridge |
| Publishing artefacts | Typst + Pandoc |

## Architectural memory tiers

1. **Canonical event/evidence** — A1/A13/D1.
2. **Curated knowledge** — Oceanos.
3. **Semantic retrieval projection** — pgvector first behind a stable Maison contract; Qdrant remains a reversible experiment.
4. **Relational/agent/provenance graph** — Osiris Memory / graph layer.
5. **Operational workflow state** — Cloudflare Workflows/Durable Objects or chosen durable runner.
6. **Commercial outcome memory** — A3 economics + experiment/outcome attribution.

## Immediate engineering direction

The core analysis organs are now implemented in-repo. The immediate engineering direction is:

- validate and smoke-test the private persistent runtime;
- bring Osiris Memory online privately before any external mirror;
- use pgvector as the first Semantic Memory backend with pinned multilingual E5 embeddings;
- keep A13 in observe-only/keyless-first when explicitly activated;
- feed A13 → A5 canonical mapping → Pre-Brain → Scout → Critic → Foundry → A14 preview;
- feed observed A3 economics and correlation-only A11 learning back as context, never as automatic policy mutation;
- keep Semantic/Osiris retrieval as supporting context, never independent evidence;
- populate pgvector only through an explicit provider allowlist and a rebuildable D1 projection sync;
- add more sensors/tools only when they fill a measured capability gap.

## Files

The machine-readable canonical inventory is:

`.github/maison-growth/technology-ledger.json`

When a new tool, source or capability is discussed, add it there with decision status, verification state and rationale.

## A14 integration rule

A14 does not replace A13, A7, A3, A8, A11 or A12. It is the analysis-only bridge that connects their existing responsibilities. Canonical external evidence stays in A13/A1/D1; Osiris Memory, Oceanos and Maison Semantic Memory remain supporting memories/projections; DuckDB/Polars remain analytical preprocessing rather than the transactional source of truth.


## Persistent memory decision

The first private runtime uses PostgreSQL/pgvector + Redis because Osiris Memory already requires that infrastructure. Maison Semantic Memory uses a separate `maison_memory` database on the same PostgreSQL server. The first local embedding provider is `intfloat/multilingual-e5-small`, pinned to a specific revision and 384 dimensions.

Osiris Memory writes from A13 go through an authenticated bridge and Osiris's Actions Waist. Brain reads use the Osiris MCP `graph_search` surface. Direct graph-table writes from Maison integration code are prohibited. PostgreSQL, Redis and MCP remain private/local by default.


## Canonical read-loop decision

The persistent Brain does not receive D1 credentials. A disabled-by-default, bearer-authenticated GET-only Brain Control API exposes the canonical A13/A5/A4/A3/A11 views required for analysis. A separate `private_brain_read_candidate` activation stage may later enable this read surface while leaving A13 world sensing, model providers, outbound action, spend and public writes off.

A5 need/intent mappings are carried into Pre-Brain. When multiple non-ambiguous A5 mappings conflict inside one signal group, the Brain preserves the conflict instead of majority-voting a canonical need.

A3 realised economics and A11 correlation-only learning return to Scout as context references. They do not become new independent evidence roots and do not automatically alter prices, weights, policy or causal claims.

## Semantic projection sync decision

Maison Semantic Memory is rebuildable. The manual `semantic-sync` profile reads the canonical Brain Control API and projects only explicitly allowlisted provider families into pgvector. The projection stores canonical evidence references and its own disposable sync cursor. An empty provider allowlist refuses to embed. The current example allowlist begins conservatively with `eurostat_`; other provider families require an explicit privacy/reuse decision before addition.


## Commercial asset decision

Existing-asset-first cannot rely only on A3 solution IDs because the public Maison catalogue already contains commercial things that are not yet mapped to canonical A3 solutions. A deterministic registry is therefore generated from `data/products.js` and `data/services.js` and used as **supporting context**, never as a new transactional source of truth.

The registry currently sees 17 catalogue assets: 5 active physical products, 2 future physical products, 9 services and 1 B2B service. Public `in_stock` is only a catalogue availability signal; it is never interpreted as a counted stock quantity.

Private operational facts — quantities, reserved units, material/packaging cost, production time, batch capacity, MOQ, shelf life, supplier lead time, service capacity, human effort and variable cost — stay UNKNOWN until supplied through the evidence-backed private overlay contract. That overlay is intentionally kept outside git.


## A14 identity decision

Opportunity, offer-hypothesis and earned-distribution-match identities are semantic rather than run-based. Equivalent canonical inputs produce the same UUID-shaped IDs across Brain runs; `created_at` does not alter identity.

A14 persistence is strict and idempotent: identical semantic payloads may be presented again without creating duplicates, but any same-ID/different-payload condition is treated as an integrity error. This preserves Opportunity Lifetime Value, Revenue Per Insight and A3/A8/A11 lineage across repeated observation cycles.


## Commercial review decision

A14 analysis can now be materialized through a separate, narrow internal proposal surface. The read-only Brain Control API remains GET-only.

Materialization is idempotent and cannot authorize launch, pricing, public writes, outbound contact, spend or experiment execution. Analysis-only hypotheses may be stored without creating human-review work. Only human-review-ready offers enter A12.

A12.2 records human commercial decisions append-only. `approved` means only `experiment_planning_only`; it is not permission to run an experiment or alter the public Maison. A separate decision token/switch is required, and the original queue row remains immutable.


## Validation planning decision

An A12 approval is not an experiment. A14.3 converts an approved offer into a validation plan whose method must match the real purchase behaviour:

- B2B/wholesale/white-label/corporate offers → manual B2B pilot;
- service/workshop/experience → manual service pilot;
- physical product/bundle/personalisation → manual physical pilot;
- partnership/distribution → manual distribution pilot;
- CTA routing → A8 only when the offer points to an existing canonical A3 solution.

CTA validation has an additional hard boundary. An A8 draft requires both a canonical A7 `test_cta` decision with passed hard gates and an explicit private CTA context containing source asset, CTA slot, control solution, treatment solution and maximum exposure count. Multiple eligible A7 decisions require explicit selection; the Brain never chooses one arbitrarily.

The A8 writer re-derives hashes and deterministic IDs at the Worker boundary. It may create only `draft` experiment state plus append-only A14↔A7↔A8 lineage. It cannot create a snapshot, mark an experiment `ready`, send traffic, publish, contact anyone, spend, change price, catalogue or checkout. Public execution remains a future A9/A12-gated step.

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
| Universal commercial opportunity + earned distribution | A14 Universal Opportunity + Earned Distribution |
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
- feed A13 → Pre-Brain → Scout → Critic → Foundry → A14;
- close the A3/A11 feedback loop with observed revenue/contribution before trusting forecasts;
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

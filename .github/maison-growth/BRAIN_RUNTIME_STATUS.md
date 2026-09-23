# Maison Brain Runtime Status

Canonical implementation status for the Maison intelligence/commercial brain.

> Code-ready does not mean live. External collection, credentials, spend, outbound contact and public writes remain disabled unless explicitly activated through their existing governance boundaries.

| Organ / capability | Repository implementation | Live runtime |
|---|---|---|
| A13 External Intelligence Mesh | READY | NOT PROVISIONED / DISABLED |
| OSIRIS OSINT passive sensors | READY with source-specific cadence policy | DISABLED |
| Eurostat structured sensor | READY explicit query-profile adapter | DISABLED |
| BASE/IMPIC procurement sensor | READY token-gated official API adapter | DISABLED / authorization+secret required |
| OpenAlex science sensor | READY metadata-only cost-accounted adapter | DISABLED / account key required |
| OpenAI Responses + web grounding | READY adapter | DISABLED / secret required |
| Gemini + Google Search grounding | READY adapter | DISABLED / secret required |
| Perplexity Sonar | READY adapter | DISABLED / secret required |
| Anthropic | READY adapter | DISABLED / secret required |
| OpenRouter | READY adapter | DISABLED / secret required |
| Osiris AI Gateway | READY optional adapter | DISABLED / config+secret required |
| Osiris Memory write mirror | READY authenticated bridge using Osiris Actions Waist | PRIVATE STACK PREPARED / NOT STARTED |
| Osiris Memory read context | READY MCP graph_search adapter + smoke profile | NOT STARTED |
| Maison Brain MCP | READY read-only tools: status/Oceanos/catalogue assets/Osiris/Semantic | OPTIONAL PROFILE / NOT STARTED |
| A1/A13/D1 canonical evidence | READY schema/contracts | D1 NOT PROVISIONED HERE |
| Brain Control API | READY GET-only feed/solutions/economics/A11 learning + A5 mappings | DISABLED |
| Canonical observe cycle | READY A5→Pre-Brain→Scout→Critic→Foundry→A14 preview + A3/A11 feedback context | OPTIONAL / NOT STARTED |
| Persistent observe runtime | READY Docker Compose: pgvector/Postgres + Redis + Osiris + authenticated bridge + healthchecks | NOT STARTED |
| Pre-Brain | READY analysis core | NOT PROVISIONED |
| DuckDB | READY optional analytical adapter | PACKAGE/HOST NOT PROVISIONED |
| Polars | READY optional analytical adapter | PACKAGE/HOST NOT PROVISIONED |
| GLiNER | READY optional adapter | MODEL/PACKAGE NOT SELECTED |
| Ruptures | READY optional adapter | PACKAGE/HOST NOT PROVISIONED |
| Multilingual E5 local embeddings | READY pinned local provider, 384d | MODEL CACHE NOT DOWNLOADED / NOT STARTED |
| Semantic projection sync | READY manual allowlisted D1→pgvector incremental projection | DISABLED / NOT RUN |
| Runtime Semantic + Osiris context | READY bounded read-only context adapters | DISABLED BY DEFAULT |
| A5 semantic interpretation | READY existing contract | analysis/runtime activation separate |
| Oceanos curated context | READY read-only editorial metadata adapter | repository context available |
| Commercial Asset Context | READY generated catalogue registry + optional evidence-backed private overlay | CATALOGUE READY / PRIVATE STOCK OVERLAY NOT LOADED |
| Maison Semantic Memory | READY pgvector backend + stable interface + manual D1→pgvector sync | NOT STARTED; pgvector first, Qdrant deferred experiment |
| Scout | READY | analysis only |
| Critic | READY | analysis only |
| Foundry | READY multi-format concept engine | analysis only |
| A7 Commercial Discovery | READY existing module | analysis only |
| A14 Universal Opportunity + Earned Distribution | READY A14.2 + deterministic hypothesis IDs + strict idempotent repository | analysis only |
| A14 materialization | READY narrow proposal API + manual runtime profile | DISABLED |
| Commercial human inbox | READY read-only A12 inbox + CLI | AVAILABLE WHEN PRIVATE READ ENABLED |
| Human review decision | READY A12.2 planning-only append-only decision API | DISABLED |
| A12 governance/HITL | READY A12.2 + append-only commercial review decisions | simulation / human-gated / execution OFF |
| A8 experiments | READY existing module | repository/simulation boundaries |
| A3 journeys/economics/attribution | READY existing module | runtime depends on event flow |
| A11 learning | READY existing module | analysis only |
| Cash & Profit mode | READY | begins measuring when A3 receives real conversions |

## Current internal flow

`A13/A1 evidence → A5 canonical need/intent mapping → brain_prebrain_feed → Pre-Brain → Oceanos + optional Semantic/Osiris + A3/A11 observed context → Scout → Critic → Foundry → A14 preview → A12 → A8 → A3 → A11 → feedback`

## Memory ownership

- **A1/A13/D1**: canonical events, observations, evidence and provenance.
- **Oceanos**: curated Maison knowledge.
- **Maison Semantic Memory**: rebuildable meaning-based retrieval projection.
- **Osiris Memory**: private relational/agent/provenance projection.
- **DuckDB/Polars**: analytical workbench, never canonical truth.
- **A3/A11**: observed commercial outcomes and learning.

No layer should become a copy of every other layer.

## Activation order

1. Run repository validators and schema migration tests.
2. Run the prepared persistent observe stack locally/private-only and pass its smoke tests; this still does not activate A13 external collection.
3. If explicitly authorised, expose only the private Brain Control API first (sensors still off) behind authenticated HTTPS and test the canonical read cycle.
4. Run the manual allowlisted semantic projection sync only after the private read path is verified.
5. Provision D1/Queue bindings and private memory bridge.
6. Configure only selected zero/low-cost providers.
7. Start A13 in observe-only with kill switches and conservative caps.
8. Feed observed A13 evidence through A5/Pre-Brain/Scout/Critic/A14.
9. Activate commercial experiments only through A12/A8 human approval.
10. Let A3/A11 replace hypotheses with observed economics; never auto-rewrite policy from correlation.

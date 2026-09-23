# Maison Brain Runtime Status

Canonical implementation status for the Maison intelligence/commercial brain.

> Code-ready does not mean live. External collection, credentials, spend, outbound contact and public writes remain disabled unless explicitly activated through their existing governance boundaries.

| Organ / capability | Repository implementation | Live runtime |
|---|---|---|
| A13 External Intelligence Mesh | READY | NOT PROVISIONED / DISABLED |
| OSIRIS OSINT passive sensors | READY with source-specific cadence policy | DISABLED |
| OpenAI Responses + web grounding | READY adapter | DISABLED / secret required |
| Gemini + Google Search grounding | READY adapter | DISABLED / secret required |
| Perplexity Sonar | READY adapter | DISABLED / secret required |
| Anthropic | READY adapter | DISABLED / secret required |
| OpenRouter | READY adapter | DISABLED / secret required |
| Osiris AI Gateway | READY optional adapter | DISABLED / config+secret required |
| Osiris Memory write mirror | READY authenticated bridge using Osiris Actions Waist | PRIVATE STACK PREPARED / NOT STARTED |
| Osiris Memory read context | READY MCP graph_search adapter + smoke profile | NOT STARTED |
| Maison Brain MCP | READY read-only tools: status/Oceanos/Osiris/Semantic | OPTIONAL PROFILE / NOT STARTED |
| A1/A13/D1 canonical evidence | READY schema/contracts | D1 NOT PROVISIONED HERE |
| Persistent observe runtime | READY Docker Compose: pgvector/Postgres + Redis + Osiris + authenticated bridge + healthchecks | NOT STARTED |
| Pre-Brain | READY analysis core | NOT PROVISIONED |
| DuckDB | READY optional analytical adapter | PACKAGE/HOST NOT PROVISIONED |
| Polars | READY optional analytical adapter | PACKAGE/HOST NOT PROVISIONED |
| GLiNER | READY optional adapter | MODEL/PACKAGE NOT SELECTED |
| Ruptures | READY optional adapter | PACKAGE/HOST NOT PROVISIONED |
| Multilingual E5 local embeddings | READY pinned local provider, 384d | MODEL CACHE NOT DOWNLOADED / NOT STARTED |
| A5 semantic interpretation | READY existing contract | analysis/runtime activation separate |
| Oceanos curated context | READY read-only editorial metadata adapter | repository context available |
| Maison Semantic Memory | READY pgvector backend + stable interface | NOT STARTED; pgvector first, Qdrant deferred experiment |
| Scout | READY | analysis only |
| Critic | READY | analysis only |
| Foundry | READY multi-format concept engine | analysis only |
| A7 Commercial Discovery | READY existing module | analysis only |
| A14 Universal Opportunity + Earned Distribution | READY A14.2 | analysis only |
| A12 governance/HITL | READY existing module | simulation / human-gated |
| A8 experiments | READY existing module | repository/simulation boundaries |
| A3 journeys/economics/attribution | READY existing module | runtime depends on event flow |
| A11 learning | READY existing module | analysis only |
| Cash & Profit mode | READY | begins measuring when A3 receives real conversions |

## Current internal flow

`A13/A1 evidence → brain_prebrain_feed → Pre-Brain → A5 + Oceanos/Semantic/Osiris context → Scout → Critic → Foundry → A7/A14 → A12 → A8 → A3 → A11 → feedback`

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
3. Provision D1/Queue bindings and private memory bridge.
4. Configure only selected zero/low-cost providers.
5. Start A13 in observe-only with kill switches and conservative caps.
6. Feed observed A13 evidence through Pre-Brain/Scout/Critic/A14.
7. Activate commercial experiments only through A12/A8 human approval.
8. Let A3/A11 replace hypotheses with observed economics.

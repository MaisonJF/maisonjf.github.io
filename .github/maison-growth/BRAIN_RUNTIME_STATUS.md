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
| A1/A13/D1 canonical evidence | READY schema/contracts + canonical `maison-growth-engine` binding | REMOTE 0001→0016 SCHEMA NOT YET VERIFIED |
| Cloudflare D1/Queue bindings | READY canonical D1 + intelligence queue/DLQ configuration in Wrangler | REMOTE RESOURCE STATE NOT YET VERIFIED |
| Brain Control API | READY GET-only feed/solutions/economics/A11 learning + A5 mappings | DISABLED |
| Canonical observe cycle | READY A5→Pre-Brain→Scout→Critic→Foundry→A14 preview + A3/A11 feedback context | OPTIONAL / NOT STARTED |
| Persistent observe runtime | READY Docker Compose: pgvector/Postgres + Redis + Osiris + authenticated bridge + healthchecks | NOT STARTED |
| Observe host preflight | READY no-start secret/port/Docker-Compose/disk checks; CI also expands full Compose config | NOT RUN ON PRIVATE HOST |
| Activation doctor | READY combined names-only credential + host readiness; recommends one next safe gate; no service start/remote write | NOT RUN ON PRIVATE HOST |
| Private activation preflight | READY stage-aware HTTPS/secret/token/authority checks + runbook | NOT RUN |
| Private Worker deploy gate | READY automatic secret-free dry-run + manual live workflow + minimal D1-only private renderer | DRY-RUN VERIFIED ON `main` @ `5b4bb1e6` |
| Private credential readiness | READY names-only report distinguishes read-only inspection credentials from full first-stage deploy credentials | CHECKED: first-stage secrets currently missing |
| Private custom-domain route | READY exact HTTPS Custom Domain from `MAISON_BRAIN_PRIVATE_URL`; workers.dev/previews/cron/queue/AI stripped | BLOCKED: private URL + Cloudflare credentials not configured |
| Cloudflare read-only inspect | READY manual workflow; optional dedicated read token; D1 reachability + Worker-presence probe + 0001→0016 inspector; no deploy/write commands | NOT RUN |
| Private deploy verification | READY read-only remote D1 schema gate + authenticated Brain health probe | NOT RUN |
| Private commercial preview | READY manual Brain-Control-only workflow; materialization/memory backends OFF; counts/authority output only | NOT RUN |
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
| Ocean → commercial routing | READY Ocean pain/intent/adjacency metadata enriches catalogue lookup as supporting context only | CODE-READY |
| Physical bundle hypotheses | READY 4 internal drafts from current catalogue subtotals; no bundle price/discount/publication authority | STOCK + MARGIN CHECKS REQUIRED |
| Commercial attention ranking | READY Ocean-informed read-only ranking across active public products/services; explicitly not a profit score | ALL ASSETS BLOCKED ON OPERATIONAL FACTS |
| Commercial attention MCP | READY read-only attention + bundle-hypothesis tools | OPTIONAL PROFILE / NOT STARTED |
| Private stocktake preparation | READY operator template covers all 5 active public physical products; contains no private values | AWAITING MANUAL COUNTS/COSTS |
| Service capacity preparation | READY operator template covers all 7 active public service/B2B entries; contains no private values | AWAITING MANUAL CAPACITY/COST FACTS |
| Structured service pricing | READY fixed vs multi-format vs starting-from vs quote pricing preserved from canonical catalogue; human selection required where appropriate | CODE-READY |
| Fact-based commercial economics | READY private evaluator for product/service unit economics + human-priced bundle evaluation | AWAITING PRIVATE OPERATIONAL OVERLAY |
| Commercial operator report | READY combines attention, observed operational facts and bundle blockers without granting execution authority | AWAITING PRIVATE OPERATIONAL OVERLAY |
| Offline commercial readiness board | READY Ocean context + catalogue pricing + operational/economic blockers + explicit next human action; zero external authority | AVAILABLE NOW |
| Maison Semantic Memory | READY pgvector backend + stable interface + manual D1→pgvector sync | NOT STARTED; pgvector first, Qdrant deferred experiment |
| Scout | READY | analysis only |
| Critic | READY | analysis only |
| Foundry | READY multi-format concept engine | analysis only |
| A7 Commercial Discovery | READY existing module | analysis only |
| A14 Universal Opportunity + Earned Distribution | READY A14.3 + deterministic IDs + review→validation planning | analysis/planning only |
| A14 materialization | READY narrow proposal API + manual runtime profile | DISABLED |
| Commercial human inbox | READY read-only A12 inbox + Commercial Action Inbox operator CLI | AVAILABLE WHEN PRIVATE READ ENABLED |
| Private commercial cycle | READY one-shot observe → optional A14 materialize → A12 inbox refresh; never self-approves | NOT STARTED |
| Offline commercial golden path | READY canonical evidence → Brain → A14 review preview → proposal-only write → A12 inbox; authority guards asserted | CI-VERIFIED |
| Human review decision | READY A12.2 planning-only append-only decision API | DISABLED |
| Approved validation planning | READY A14.3 behaviour-matched manual/B2B/physical/service/CTA plans | DISABLED / PREVIEW-FIRST |
| Manual pilot prerequisites | READY plan-kind reason codes require stock/cost/price or capacity/effort/quote/consent facts before human execution | HUMAN-GATED |
| Manual pilot dossiers | READY read-only operator dossiers + safe identifier-free summary + evidence-backed private pilot context; physical/service readiness still requires one complete real candidate | AVAILABLE AFTER PRIVATE READ + APPROVED PLANS; PRIVATE INPUTS NOT LOADED |
| A8 CTA draft planning | READY explicit private CTA context + hard-gated A7 decision → A8 draft | DISABLED / DRAFT ONLY |
| A12 governance/HITL | READY A12.2 + append-only commercial review decisions | simulation / human-gated / execution OFF |
| A8 experiments | READY existing module + narrow draft materialization | DRAFT/SIMULATION ONLY; READY/RUNNING NOT AUTHORIZED |
| A3 journeys/economics/attribution | READY existing module | runtime depends on event flow |
| A11 learning | READY existing module | analysis only |
| Cash & Profit mode | READY | begins measuring when A3 receives real conversions |

## Current internal flow

`A13/A1 evidence → A5 mapping → Pre-Brain/context → Scout → Critic → Foundry → A14 → A12 human review → A14 validation plan → (manual pilot OR A7 hard-gated CTA decision → A8 draft) → future authorized execution → A3 → A11 → feedback`

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
5. Verify the existing D1/Queue bindings remotely, apply any missing schema migration through 0016, then connect the private memory bridge.
6. Configure only selected zero/low-cost providers.
7. Start A13 in observe-only with kill switches and conservative caps.
8. Feed observed A13 evidence through A5/Pre-Brain/Scout/Critic/A14.
9. Activate commercial experiments only through A12/A8 human approval.
10. Let A3/A11 replace hypotheses with observed economics; never auto-rewrite policy from correlation.

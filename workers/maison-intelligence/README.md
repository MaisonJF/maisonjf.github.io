# MAISON JF · External Intelligence Worker

This Worker is the live runtime prepared for A13 External Intelligence Mesh.

It is deliberately **off by default**. Repository code alone cannot spend money or call external AI APIs.

## Runtime flow

`Cloudflare Cron → Queue → provider adapters → A13 privacy/provenance/echo control → A1 event + A13 observation + A4 map_evidence → A5 Brain`

The public Maison site does not depend on this Worker.

## Passive world sensors

The Worker can also ingest the keyless, passive OSIRIS public API into the same A13 provenance pipeline. The passive registry now covers the broad read-only world-sensing surface: aggregate stats, aviation, satellites, space weather, earthquakes, fires, severe weather, air quality, navigation interference, conflicts, GDELT events, country risk, news, markets, supply-chain suppliers, public CCTV metadata, infrastructure, maritime traffic and cyber-threat/malware telemetry. Raw camera streams are never treated as interpreted behaviour; a dedicated aggregate vision layer is still required before camera imagery can become behavioural evidence.

OSIRIS sensing is disabled by default. When enabled, the Worker wakes hourly but each passive source is collected only when its conservative source-specific cadence is due. Cadences are explicit initial policy and may be overridden with `OSIRIS_SOURCE_CADENCES_JSON`; they are not assumptions about source truth or freshness. Results are stored as `public_web` evidence with source provenance.

## Osiris family

The Maison uses the three distinct Osiris systems for different roles:

- **OSIRIS OSINT** — passive world sensing into A13/Oceans/Brain.
- **Osiris Memory** — optional self-hosted persistent agent memory/coordination. The Worker never exposes Osiris Memory directly; it can mirror already privacy-reviewed observations through a separately authenticated HTTPS bridge co-located with the private Memory service.
- **Osiris AI Gateway** — optional OpenAI-compatible model gateway/fallback route.

All three remain disabled until explicitly configured.

## Providers

Adapters are implemented for:

- Google Search Console Search Analytics (read-only OAuth; direct visibility/coverage evidence);
- Bing Webmaster Tools (read-only OAuth; rank/traffic, page and query observations);
- Osiris AI Gateway (OpenAI-compatible; ungrounded unless its returned data is independently sourced);
- OpenRouter Chat Completions (provider/model gateway; ungrounded unless a later grounded adapter is configured);
- OpenAI Responses API + Web Search;
- Google Gemini + Google Search grounding;
- Perplexity Sonar;
- Anthropic Messages API (ungrounded sensor unless a later grounded adapter is added).

A provider is skipped unless its secret and required model setting are configured.

## Safety defaults

- environment `WORKER_ENABLED=false`;
- environment `KILL_SWITCH=true`;
- environment `OSIRIS_ENABLED=false`;
- environment `OSIRIS_GATEWAY_ENABLED=false`;
- environment `OSIRIS_MEMORY_ENABLED=false`;
- template `SEARCH_VISIBILITY_ENABLED=false` and `SEARCH_VISIBILITY_PROBES_ENABLED=false`;
- Search Console uses the read-only `webmasters.readonly` OAuth scope and never stores access/refresh tokens in observations;
- OSIRIS uses only an explicit passive-source allowlist; active scanner/RECON routes are not part of this Worker;
- passive sources use conservative per-source cadences instead of polling every feed every hour;
- database kill switch = ON after migration;
- two territories per run;
- maximum two calls per provider per UTC day;
- queue concurrency = 1;
- three retries with delay;
- dead-letter queue;
- direct contact details are redacted before persistence;
- external output is stored as untrusted observation/evidence data only;
- no external model has repository, publishing, checkout, price, catalogue or permission authority.

## 1. Verify Cloudflare resources

The repository already carries the canonical Worker binding for the Maison Growth database:

- D1 database: `maison-growth-engine`;
- Queue: `maison-intelligence`;
- dead-letter Queue: `maison-intelligence-dlq`.

Do **not** create a second database merely because an older bootstrap note says `maison-growth`. For the existing Maison environment, authenticate Wrangler and inspect the configured resources first.

```bash
npm install
npx wrangler login
bash scripts/inspect-growth-migrations.sh maison-growth-engine
```

The inspector is read-only and reports migration sentinels from `0001` through `0016`.

For a completely fresh environment only, create the resources explicitly and then update a deployment copy of `wrangler.jsonc` with the returned D1 ID.

```bash
npx wrangler d1 create maison-growth-engine
npx wrangler queues create maison-intelligence
npx wrangler queues create maison-intelligence-dlq
```

## 2. Apply Growth migrations

**Use the helper below only for a fresh, dedicated database.** It applies the complete current Growth schema from A1 through the Brain/A12/A14 planning surfaces at migration `0016`. It is not an idempotent upgrade script for an already-initialized database, and it now refuses to run unless `--confirm-fresh` is supplied.

```bash
bash scripts/apply-growth-migrations.sh maison-growth-engine --confirm-fresh
```

On an existing database, run the read-only inspector first and apply only reviewed missing migrations. The A13 migration intentionally leaves its database kill switch ON; A14 adds analysis/planning structures but no outbound authority.

## 3. Configure provider secrets

Configure any subset. Do not commit values to GitHub and do not place them in ordinary Worker vars.

Secret names:

- `OSIRIS_GATEWAY_API_KEY`
- `OSIRIS_MEMORY_BRIDGE_TOKEN`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `PERPLEXITY_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`
- `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`
- `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN`
- `BING_WEBMASTER_CLIENT_ID`
- `BING_WEBMASTER_CLIENT_SECRET`
- `BING_WEBMASTER_REFRESH_TOKEN`

Model vars live in `wrangler.jsonc`. Osiris Gateway deliberately has no guessed default model. OpenRouter defaults to `openrouter/free` in the template and remains disabled until explicitly enabled. Anthropic is intentionally blank in the template so no model is guessed silently.

## 4. Validate before activation

```bash
npm test
npm run check
npx wrangler deploy --dry-run
```

Then deploy while both kill switches are still ON.

## 5. Activate in observe-only mode

After verifying bindings, Queue, D1 and provider secrets:

1. set `KILL_SWITCH=false` and `WORKER_ENABLED=true` in the Worker environment/config;
2. deploy;
3. turn off the database kill switch:

```bash
npx wrangler d1 execute maison-growth-engine --remote --command \
  "UPDATE external_intelligence_control SET kill_switch=0, observe_only=1, updated_at=datetime('now'), updated_by='human_activation' WHERE control_id='global';"
```

The first live mode remains observe-only. It collects and stores evidence; it does not publish.

## 6. Emergency stop

Either switch stops collection:

- set `KILL_SWITCH=true` and deploy; or
- execute:

```sql
UPDATE external_intelligence_control
SET kill_switch=1, updated_at=datetime('now'), updated_by='human_kill_switch'
WHERE control_id='global';
```

## Cost discipline

The grounded/AI research and GEO visibility-probe schedule runs daily at 04:17 UTC. The live zero-cost profile may use a separately capped OpenRouter free-model brand-representation probe; grounded generic-discovery probes run only on providers with web grounding. Search Console snapshots use their own cap and do not consume model calls. The passive OSIRIS schedule is hourly when explicitly enabled, with a separate per-source daily cap. With the default two AI territories and cap of two calls/provider/day, a configured AI provider can make at most two calls per UTC day. Increase only after inspecting real provider usage.

When a provider reports cost metadata, A13 records it in `external_intelligence_daily_usage.reported_cost_usd`. Call caps remain authoritative because not every provider reports cost in the same way.

## Search visibility radar

A13 can measure discovery as evidence rather than treating SEO as a static checklist.

- **Google Search Console**: direct Search Analytics snapshots for pages, queries, countries and devices. These observations use `source=gsc`, `evidence_kind=coverage`, `source_class=search_platform` and are not interpreted as human demand by themselves.
- **Google URL Inspection**: rotates one critical canonical MAISON URL per day and records verdict, coverage state, robots state, indexing permission, fetch result, last crawl and Google-vs-user canonical. It uses the same read-only OAuth boundary and does not request indexing.
- **Search Console Sitemaps**: reads sitemap submission/download state, pending state, warnings/errors and submitted URL counts. The deprecated `indexed` field is intentionally discarded rather than treated as a live coverage metric.
- **Bing Webmaster Tools**: read-only OAuth snapshots for daily rank/traffic and weekly top-page/top-query data. Bing observations remain `coverage` evidence and use provider provenance rather than pretending to be Google evidence.
- **GEO/AI probes**: controlled user-like questions sent to configured model providers. Brand probes may measure ungrounded model representation; generic-discovery probes are restricted to web-grounded OpenAI, Gemini or Perplexity adapters.
- **Absence counts**: a model not mentioning MAISON JF is a valid visibility observation. Prompts explicitly forbid forcing the brand into the answer.
- **Echo control remains**: citations, not provider count, determine independent web evidence. An uncited OpenRouter/Osiris answer never becomes search-ranking evidence.
- **No publication authority**: visibility data flows through the existing A13 → A4/A5 → Brain route and cannot change pages, prices, permissions or campaigns.

The repository template keeps this radar off. The current live zero-cost configuration enables the probe switch but remains bounded by provider configuration, free-model enforcement and separate daily caps. Direct Search Console collection creates zero tasks until all OAuth credentials are present.

## Brain feed

Every accepted sensor response creates a privacy-reviewed `map_evidence` fact for A5 as well as the richer A13 provenance record.

`external_intelligence_brain_feed` summarizes observations by territory/day and, critically, counts **independent canonical evidence roots** separately from provider count. Ten models repeating one URL therefore remain one evidence root.

This is sensor evidence, not automatic truth and not publication permission.


## Osiris Memory deployment boundary

Osiris Memory currently targets a single trusted operator and binds its MCP/HTTP services to localhost without a production multi-user authentication layer. Do **not** expose its port directly to the public Internet.

Maison integration therefore uses a bridge contract:

`A13 privacy-reviewed observation → authenticated HTTPS bridge → local Osiris Memory MCP (:8790) → PostgreSQL/Redis graph`

The bridge URL and bearer token are environment/secrets only. A Memory bridge failure never prevents the canonical A13/D1 observation from being stored.


## Public economic/science sensors

A13 now has a second, separately gated public-source family for structured economic/B2B/science sensing. The master switch is `PUBLIC_DATA_ENABLED=false`; every individual source is also disabled by default.

### Eurostat

- official Statistics API;
- no API key in the adapter;
- query profiles are explicit through `EUROSTAT_QUERIES_JSON`;
- each profile carries its own territory and cadence;
- no default datasets are silently queried.

### BASE / IMPIC public procurement

- adapter targets the official Portal BASE API allowlist only;
- production API access requires prior IMPIC authorization and `BASE_PT_API_TOKEN`;
- if the token is absent, A13 creates **zero BASE tasks**;
- the token is sent only in the `_AcessToken` header and never stored in citations/provenance.

### OpenAlex

- production adapter requires an account API key even though limited anonymous/demo access exists;
- the key is sent in the Authorization header, never in the request URL;
- `meta.cost_usd` is recorded into A13 usage accounting when returned;
- `MAX_DAILY_CALLS_PER_PUBLIC_SOURCE` provides an additional Maison-side cap;
- no PDF/full-text download is implemented here.

These adapters remain sensors only. Structured source output is still stored as an A13 observation with canonical provenance and must pass through Pre-Brain/Brain before any commercial interpretation.


## Brain control API — read-only canonical feed

The Worker now contains a disabled-by-default internal API for the private Brain runtime to read canonical D1 facts without receiving D1 credentials.

`BRAIN_CONTROL_API_ENABLED=false` by default. `BRAIN_CONTROL_TOKEN` is a secret and is never committed.

Authenticated GET-only routes include:

- `/internal/brain/health`
- `/internal/brain/feed` — A13/A4 evidence for Pre-Brain;
- `/internal/brain/cash-feedback` — observed A3 economic assessments with A14 lineage where available;
- `/internal/brain/learning` — bounded A11 learning context;
- `/internal/brain/solutions` and `/internal/brain/solution-links`;
- `/internal/brain/review-queue`;
- `/internal/brain/approved-validations`;
- `/internal/brain/validation-plans`;
- `/internal/brain/a7-decisions`;
- `/internal/brain/action-inbox` — the Commercial Action Inbox.

The Brain Control surface itself has no write routes. Proposal/review-decision writes live behind separate disabled-by-default APIs and separate tokens. Responses are `no-store`; unknown routes remain 404. When deployed outside a private network, put the private Brain route behind authenticated HTTPS/Cloudflare Access in addition to the bearer token.

# MAISON JF · External Intelligence Worker

This Worker is the live runtime prepared for A13 External Intelligence Mesh.

It is deliberately **off by default**. Repository code alone cannot spend money or call external AI APIs.

## Runtime flow

`Cloudflare Cron → Queue → provider adapters → A13 privacy/provenance/echo control → A1 event + A13 observation + A4 map_evidence → A5 Brain`

The public Maison site does not depend on this Worker.

## Passive world sensors

The Worker can also ingest the keyless, passive OSIRIS public API into the same A13 provenance pipeline. The initial allowlist covers aggregate stats, earthquakes, fires, severe weather/natural events, public news feeds and markets. CCTV metadata is supported by the adapter registry but is intentionally opt-in until a dedicated aggregate vision layer is attached; raw camera feeds are never treated as interpreted behaviour.

OSIRIS sensing is disabled by default. When enabled, the template schedules passive collection hourly and stores it as `public_web` evidence with source provenance.

## Osiris family

The Maison uses the three distinct Osiris systems for different roles:

- **OSIRIS OSINT** — passive world sensing into A13/Oceans/Brain.
- **Osiris Memory** — optional self-hosted persistent agent memory/coordination. The Worker never exposes Osiris Memory directly; it can mirror already privacy-reviewed observations through a separately authenticated HTTPS bridge co-located with the private Memory service.
- **Osiris AI Gateway** — optional OpenAI-compatible model gateway/fallback route.

All three remain disabled until explicitly configured.

## Providers

Adapters are implemented for:

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
- OSIRIS uses only an explicit passive-source allowlist; active scanner/RECON routes are not part of this Worker;
- database kill switch = ON after migration;
- two territories per run;
- maximum two calls per provider per UTC day;
- queue concurrency = 1;
- three retries with delay;
- dead-letter queue;
- direct contact details are redacted before persistence;
- external output is stored as untrusted observation/evidence data only;
- no external model has repository, publishing, checkout, price, catalogue or permission authority.

## 1. Create Cloudflare resources

From this directory:

```bash
npm install
npx wrangler login
npx wrangler d1 create maison-growth
npx wrangler queues create maison-intelligence
npx wrangler queues create maison-intelligence-dlq
```

Copy `wrangler.template.jsonc` to `wrangler.jsonc` and replace `REPLACE_WITH_D1_DATABASE_ID` with the ID returned by Cloudflare.

## 2. Apply Growth migrations

**Use the helper below only for a fresh, dedicated `maison-growth` database.** It applies the complete Growth schema from A1 through A13 and is not an idempotent upgrade script for an already-initialized database.

```bash
bash scripts/apply-growth-migrations.sh maison-growth
```

The A13 migration intentionally leaves its database kill switch ON.

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
npx wrangler d1 execute maison-growth --remote --command \
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

The grounded/AI research schedule runs daily at 04:17 UTC. The passive OSIRIS schedule is hourly when explicitly enabled, with a separate per-source daily cap. With the default two AI territories and cap of two calls/provider/day, a configured AI provider can make at most two calls per UTC day. Increase only after inspecting real provider usage.

When a provider reports cost metadata, A13 records it in `external_intelligence_daily_usage.reported_cost_usd`. Call caps remain authoritative because not every provider reports cost in the same way.

## Brain feed

Every accepted sensor response creates a privacy-reviewed `map_evidence` fact for A5 as well as the richer A13 provenance record.

`external_intelligence_brain_feed` summarizes observations by territory/day and, critically, counts **independent canonical evidence roots** separately from provider count. Ten models repeating one URL therefore remain one evidence root.

This is sensor evidence, not automatic truth and not publication permission.


## Osiris Memory deployment boundary

Osiris Memory currently targets a single trusted operator and binds its MCP/HTTP services to localhost without a production multi-user authentication layer. Do **not** expose its port directly to the public Internet.

Maison integration therefore uses a bridge contract:

`A13 privacy-reviewed observation → authenticated HTTPS bridge → local Osiris Memory MCP (:8790) → PostgreSQL/Redis graph`

The bridge URL and bearer token are environment/secrets only. A Memory bridge failure never prevents the canonical A13/D1 observation from being stored.

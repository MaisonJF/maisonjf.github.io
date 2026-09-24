# Maison persistent observe runtime

This directory prepares the persistent local/private runtime needed by the Maison Brain without enabling production collection, outbound actions, public writes or paid model calls.

## Why this shape

Osiris Memory currently requires Python 3.12, PostgreSQL 16+ and Redis 7+. Its own dependencies include vector support. Maison therefore starts the Semantic Memory experiment on the **same PostgreSQL server using pgvector**, but in a separate `maison_memory` database. This avoids operating Qdrant and PostgreSQL at the same time before Qdrant proves unique value.

The Osiris upstream source is not vendored. The image clones a pinned upstream commit at build time and keeps its AGPL-3.0-or-later source in the container. Maison bridge code is separate and only calls Osiris's public/internal Actions layer; it does not write directly into Osiris graph tables.

## Safety defaults

- Postgres, Redis, Osiris MCP and the bridge bind to `127.0.0.1` only.
- The A13 bridge requires a bearer token.
- No Cloudflare Worker setting is changed by this compose file.
- OSIRIS OSINT/model providers remain disabled in the Worker until separately authorised.
- Osiris worker is behind the optional `worker` profile.
- No public port/TLS reverse proxy is configured here. If A13 later mirrors from Cloudflare, expose only the bridge through an authenticated HTTPS private ingress; never expose Postgres/Redis.

## Activation doctor — one safe first command

To get one names-only readiness snapshot before touching Cloudflare or starting containers:

```bash
python .github/maison-growth/runtime/activation_doctor.py \
  --env-file .env.observe
```

The doctor combines credential presence with the no-start host checks, prints no secret values, starts zero services and performs zero remote changes. Its `recommended_next_step` deliberately stops at the next safe gate: fix the local host, configure read-only Cloudflare credentials, run the read-only Cloudflare inspection, or run the private Brain read preflight.

## Host preflight — no services started

Before building or starting the private persistent stack, validate the local host:

```bash
python .github/maison-growth/runtime/preflight_observe_host.py \
  --env-file .env.observe
```

The preflight checks the two base secrets without printing them, rejects placeholders/reused base secrets, validates host-port collisions/availability, confirms Docker Compose can expand the full file, and reports free disk. It performs **no remote changes** and starts **zero services**. Optional Cloudflare/Brain profiles receive structural local placeholders during the Compose syntax check when they are not configured yet; that does not activate them.

## Build only

```bash
cp .github/maison-growth/runtime/.env.observe.example .env.observe
# replace CHANGE_ME values locally

docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  build
```

## Start private dependencies

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  up -d postgres redis osiris-init osiris-mcp maison-osiris-bridge
```

The bridge health endpoint is local-only at `http://127.0.0.1:8791/health`.

Do not set `OSIRIS_MEMORY_ENABLED=true` in A13 until the bridge is reachable over authenticated HTTPS and the observation-mirroring smoke test passes.


## Validate Brain container

This profile installs only the core analytical dependencies and runs repository validators:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-validation run --rm brain-validate
```

## Semantic Memory smoke

This is an **explicit/manual** profile because it downloads the pinned multilingual E5 model into a persistent local model cache and writes only a system fixture to the `maison_memory` projection database.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile semantic-smoke run --rm semantic-smoke
```

The selected first model is `intfloat/multilingual-e5-small`, pinned to revision `03415a4be176a1620747c692ed433219fabc3def`, 384 dimensions. Qdrant is not started; pgvector is the first experiment because PostgreSQL is already required by Osiris Memory.


## Osiris read-context smoke

This verifies the Brain can discover the pinned Osiris `graph_search` MCP tool through the private Docker network. It does not write to Osiris and does not expose MCP publicly.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile osiris-context-smoke run --rm osiris-context-smoke
```

The Brain client is pinned to MCP Python SDK `1.28.1`, matching the minimum version declared by the pinned Osiris source. Read context uses `graph_search(query, project, max_depth)`; retrieval rank is context relevance, never evidence confidence.


## Maison Brain MCP — read-only tool port

The optional `brain-mcp` profile exposes a local MCP endpoint on `127.0.0.1:8792/mcp` (or the configured host port). It is deliberately **read-only**.

Available tools:

- `maison_brain_status`
- `maison_ocean_search`
- `maison_commercial_asset_search`
- `maison_osiris_search`
- `maison_semantic_search`

There are no tools for outreach, email/DM, publication, catalogue, price, checkout or spend.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-mcp up -d brain-mcp
```

This profile is not part of the default stack and is not started by repository changes.


## Canonical observe cycle

The optional `brain-observe` profile reads canonical A13/A4/A3 data through the authenticated Brain Control API and runs a one-shot:

`A5 mapping → Pre-Brain → Oceanos/A3/A11 + optional Semantic/Osiris context → Scout → Critic → Foundry → A14 preview`

It prints internal packets and A14 previews only. It performs **zero writes** and has no execution authority.

Existing solution fit is derived from A4 `need_solution_relations`, not guessed from product names. A3 solution price/cost fields are not silently converted into opportunity forecasts. New candidate offer families/economics/operational constraints can be supplied only through explicit `MAISON_BRAIN_TERRITORY_POLICY_JSON`.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-observe run --rm brain-observe-cycle
```

Do not enable the remote Brain Control API merely to run this command until its HTTPS/private-access boundary has been configured and explicitly authorised.


## Manual Semantic projection sync

The optional `semantic-sync` profile incrementally projects selected canonical A13 observations from D1 into pgvector. It is a rebuildable index, not a second source of truth.

The sync is deliberately manual and privacy-allowlisted. `MAISON_SEMANTIC_SYNC_PROVIDER_PREFIXES` must contain at least one explicitly approved provider family or the process refuses to embed. The example starts with `eurostat_` only.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile semantic-sync run --rm semantic-sync
```

The projection keeps the canonical evidence reference. Its cursor lives inside `maison_memory` and may be discarded/rebuilt without changing D1.

## Optional runtime memory context

The one-shot Brain cycle can read Semantic Memory and Osiris Memory, but both switches are **off by default**:

- `MAISON_SEMANTIC_CONTEXT_ENABLED=false`
- `MAISON_OSIRIS_CONTEXT_ENABLED=false`

When enabled on the private host, these systems contribute retrieval/context references only. They add **zero independent evidence roots** and never turn similarity or graph proximity into fact.


## Commercial Asset Context

`commercial-assets.generated.json` is a deterministic, rebuildable projection of the existing Maison product and service catalogues. It is guarded in CI against drift from `data/products.js` and `data/services.js`.

The generated registry records known catalogue facts such as product/service identity, public price where machine-readable, lifecycle status and catalogue availability. It deliberately keeps operational fields null/UNKNOWN.

The optional private overlay contract is `commercial-asset-overlay.schema.json`. An operator may keep a matching JSON file **outside git** and point `MAISON_COMMERCIAL_ASSET_OVERLAY_PATH` to it. Any known operational value requires an evidence reference. Catalogue `in_stock` never becomes counted inventory.

The general Maison Brain MCP tool `maison_commercial_asset_search` does **not** load or expose the private overlay; it returns catalogue-derived context only.


## Private activation preflight

Before enabling any private remote Brain surface, run the stage-specific local preflight. It checks HTTPS boundaries, placeholder/missing secrets, token separation and the zero-authority invariants without printing secret values or changing remote state.

```bash
python .github/maison-growth/runtime/preflight_private_runtime.py \
  private_brain_read_candidate \
  --env-file .env.observe
```

The exact staged path from private read to first A12 inbox entries is documented in `PRIVATE_ACTIVATION_RUNBOOK.md`.

## One-command private commercial cycle

Once the private read and proposal surfaces pass preflight, the `commercial-cycle` profile runs the useful internal loop in one shot:

`read inbox → observe canonical evidence → Brain/A14 → optional proposal materialization → read inbox again`

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile commercial-cycle run --rm commercial-cycle
```

With `MAISON_A14_MATERIALIZE_ENABLED=false` it is preview-only. With the flag explicitly set to `true`, it may write only A14 hypotheses and A12 human-review queue items through the narrow proposal API. It never records the human decision, executes A8, publishes, contacts anyone or spends money.

## Commercial Action Inbox

The read-only operator view now has its own profile:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile commercial-inbox run --rm commercial-inbox
```

It summarizes pending human decisions, approved manual pilots and A8 drafts. It performs zero writes.

## A14 materialization and human review

The Brain now has a narrow, disabled-by-default path from analysis into canonical commercial review:

`observe cycle → A14 hypotheses → D1 materialization → A12 human inbox → append-only human decision`

Materialization is manual:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile a14-materialize run --rm a14-materialize
```

`MAISON_A14_MATERIALIZE_ENABLED=false` is the default. With it false, the command computes selection counts but performs no proposal writes.

The proposal write surface is separate from the read-only Brain Control API. It uses `BRAIN_PROPOSAL_API_ENABLED` and `BRAIN_PROPOSAL_TOKEN`. Analysis-only hypotheses may be persisted without entering A12. Only `human_review_preview` offers are queued for human review.

The commercial inbox is read with:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile commercial-review run --rm commercial-review
```

A human decision is a separate authority. The review-decision API has its own switch and token. To record one manually, run the same container with an explicit command, for example:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile commercial-review run --rm commercial-review \
  python /opt/maison-growth/brain/commercial_review_cli.py decide \
  <QUEUE_ID> approved --reason "Aprovo apenas o planeamento do teste"
```

This requires `MAISON_REVIEW_DECISION_ENABLED=true`.

**Approval means experiment planning only.** A12.2 stores the decision append-only and structurally keeps `public_write_authorized=0`, `outbound_authorized=0`, `spend_authorized=0` and `experiment_execution_authorized=0`.


## Approved validation planning

After a commercial offer has been approved through A12, the optional `validation-plan` profile turns it into the validation method that matches the offer's real purchase behaviour.

With `MAISON_VALIDATION_PLAN_MATERIALIZE_ENABLED=false` it is preview-only:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile validation-plan run --rm validation-plan
```

The planner does not force every opportunity through A8. B2B, service, physical-product and distribution opportunities become manual-pilot plans. Only CTA routing to an existing canonical solution is eligible for the A7/A8 path.

## A8 CTA draft planning

A CTA experiment requires real route context that the Brain must not guess. Put the private file at:

`.github/maison-growth/runtime/.private/cta-context.json`

The directory is gitignored. The file follows `brain/cta-experiment-context.schema.json` and records, per validation plan:

- source asset ID;
- CTA slot key;
- control solution ID;
- treatment solution ID;
- maximum exposure count;
- evidence references;
- optional explicit A7 decision ID when more than one eligible decision exists.

Preview:

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile a8-draft run --rm a8-draft
```

`MAISON_A8_DRAFT_MATERIALIZE_ENABLED=false` is the default.

When explicitly enabled, the command may persist an A8 experiment **only in `draft` state**. The Worker independently re-derives the semantic input hash, experiment/version/variant/state IDs and variant payload hashes before writing.

The draft path structurally requires a canonical A7 `test_cta` decision with passed hard gates and the same treatment solution. It writes append-only A14↔A7↔A8 lineage.

It does **not** capture the pre-change public snapshot, claim `ready`, assign traffic, run the experiment, publish anything, contact anyone, spend money or alter catalogue/price/checkout. Those remain later A8/A9/A12 steps and require separate authority.

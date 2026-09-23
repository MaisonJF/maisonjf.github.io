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

`Pre-Brain → Scout → Critic → Foundry`

It prints internal packets only. It performs **zero writes**.

Existing solution fit is derived from A4 `need_solution_relations`, not guessed from product names. A3 solution price/cost fields are not silently converted into opportunity forecasts. New candidate offer families/economics/operational constraints can be supplied only through explicit `MAISON_BRAIN_TERRITORY_POLICY_JSON`.

```bash
docker compose \
  --env-file .env.observe \
  -f .github/maison-growth/runtime/docker-compose.observe.yml \
  --profile brain-observe run --rm brain-observe-cycle
```

Do not enable the remote Brain Control API merely to run this command until its HTTPS/private-access boundary has been configured and explicitly authorised.

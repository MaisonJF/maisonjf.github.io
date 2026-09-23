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

#!/bin/sh
set -eu

ENV_FILE="${1:-.env.observe}"
COMPOSE=".github/maison-growth/runtime/docker-compose.observe.yml"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE" config >/dev/null

docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d postgres redis osiris-init osiris-mcp maison-osiris-bridge

curl -fsS http://127.0.0.1:${MAISON_OSIRIS_BRIDGE_PORT:-8791}/health >/dev/null

# A streamable MCP endpoint returns a protocol-level response rather than a normal page.
code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:${OSIRIS_MCP_PORT:-8790}/mcp || true)"
case "$code" in
  200|400|405|406) ;;
  *) echo "unexpected Osiris MCP health code: $code" >&2; exit 1 ;;
esac

echo "Maison persistent runtime smoke: OK"

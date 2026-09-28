# Cloudflare Permission Guide — Maison Private Runtime

Last reviewed against the Maison runtime architecture on 2026-09-28.

The operator-facing goal is deliberately simple: **one manual workflow, one Brain root token, one Cloudflare Access service token pair**. Internal proposal/review credentials are derived at runtime and are never additional operator-managed GitHub secrets.

## Required GitHub secrets

The one-button `Maison Private Runtime` workflow requires:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` — Worker deployment/custom-domain token
- `MAISON_BRAIN_PRIVATE_URL` — HTTPS origin for the private Worker
- `MAISON_BRAIN_CONTROL_TOKEN` — single Maison private-runtime root token
- `MAISON_CF_ACCESS_CLIENT_ID`
- `MAISON_CF_ACCESS_CLIENT_SECRET`

Optional:

- `CLOUDFLARE_READ_API_TOKEN` — dedicated read-only D1 inspection token; the workflow falls back to the deployment token for schema verification when absent

Do **not** create separate `MAISON_BRAIN_PROPOSAL_TOKEN` or `MAISON_BRAIN_REVIEW_DECISION_TOKEN` secrets for normal operation. Scoped proposal/review tokens are deterministically derived from the existing Brain root token immediately before deployment. The derived values remain distinct and are masked in GitHub Actions.

## Permission separation

### Read-only D1 inspection

Read-only inspection needs to read D1 metadata and execute SELECT-only schema checks against `maison-growth-engine`. Prefer `CLOUDFLARE_READ_API_TOKEN` when practical. No D1 write permission is needed for normal private-runtime deployment.

### Worker deployment and Custom Domain

The deployment token must be able to deploy `maison-intelligence` and configure its exact Custom Domain. The runtime workflow never enables `workers.dev` or preview URLs.

### D1 schema changes

Schema mutation remains separate from normal runtime activation. The one-button workflow verifies the remote schema and refuses deployment if required schema is missing; it does not apply migrations.

### Cloudflare Access

Cloudflare Access is mandatory for the live private runtime. The workflow requires the service-token ID/secret pair and then verifies both authentication layers after deployment:

1. requests without Cloudflare Access are rejected at the edge;
2. requests with Access but without the Maison bearer token are rejected by the Worker;
3. fully authenticated Brain reads succeed in `read_only` mode.

The workflow does not create or weaken the Zero Trust application itself.

## Runtime boundary

The private deployment hard-locks:

- `workers_dev=false`;
- preview URLs OFF;
- cron triggers removed;
- Queue bindings removed;
- Workers AI binding removed;
- external collection OFF;
- `WORKER_ENABLED=false`;
- `KILL_SWITCH=true`;
- public write OFF;
- outbound OFF;
- spend OFF;
- experiment execution OFF.

Brain read, proposal materialization and human-review decision surfaces can all be privately available while those external authority switches remain OFF.

## Operator rule

For normal operation, use **Actions → Maison Private Runtime → Run workflow**. There are no stage, apply or Access-confirmation inputs. The workflow validates prerequisites itself and either completes fully or fails closed.

## Official references

- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/d1/wrangler-commands/

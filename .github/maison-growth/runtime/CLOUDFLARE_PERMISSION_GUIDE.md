# Cloudflare Permission Guide — Maison Private Brain

Last reviewed against Cloudflare documentation on 2026-09-24.

The goal is least privilege: inspection, deployment, D1 mutation and Access administration are separate capabilities.

## GitHub secrets used by the prepared workflows

First private-read activation:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` — deployment token
- `MAISON_BRAIN_PRIVATE_URL`
- `MAISON_BRAIN_CONTROL_TOKEN`

Optional but recommended:

- `CLOUDFLARE_READ_API_TOKEN` — read-only inspection token; the inspect workflow falls back to `CLOUDFLARE_API_TOKEN` when absent
- `MAISON_CF_ACCESS_CLIENT_ID`
- `MAISON_CF_ACCESS_CLIENT_SECRET`

Later stages only:

- `MAISON_BRAIN_PROPOSAL_TOKEN`
- `MAISON_BRAIN_REVIEW_DECISION_TOKEN`

## Permission separation

### 1. Read-only inspection

The manual `Maison Cloudflare Read-Only Inspect` workflow needs to:

- read D1 metadata for `maison-growth-engine`;
- run read-only SELECT statements against D1;
- attempt to list deployments for `maison-intelligence`.

Prefer a dedicated read token when practical. It does not need route changes, Worker deployment, D1 writes or Access administration.

### 2. Existing Worker deployment

Cloudflare documents **Editor** access for deploying an existing Worker. The Maison live workflow also configures an exact Custom Domain, so the token needs **Workers Routes Write** on the affected zone when that domain connection is added or changed.

If the read-only inspection cannot confirm that `maison-intelligence` already exists, do not assume Editor is sufficient: Cloudflare documents product-level **Admin** for creating a new Worker. Use that elevated capability only for initial creation if it is actually required.

### 3. D1 schema changes

The normal private deployment workflow only **reads** the D1 schema and refuses to continue when required Brain/A12/A14 surfaces are missing.

Applying missing migrations is a separate operator action. Cloudflare requires **D1 Edit** for database writes. Do not add D1 Edit merely to make the read-only inspection pass.

### 4. Cloudflare Access

The repository workflow does not create or weaken a Zero Trust Access application. Access protection is configured separately for the private hostname. Cloudflare supports protecting a specific Custom Domain/hostname with Access.

The Access service-token ID/secret used by Brain clients are application credentials; they are not substitutes for the permissions needed to administer Access itself.

## Current Maison deployment boundary

The live private renderer keeps:

- `workers_dev=false`;
- preview URLs disabled;
- cron triggers removed;
- Queue bindings removed;
- Workers AI binding removed;
- external collection OFF;
- D1 as the canonical data binding;
- Brain Control enabled only for the chosen private stage.

A valid Cloudflare token never overrides these repository guards.

## Official references

- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://developers.cloudflare.com/d1/platform/release-notes/

# Maison Private Runtime — operator runbook

The operator path is intentionally one button.

## Normal activation

Open GitHub Actions and run:

**Maison Private Runtime → Run workflow**

There are no stage, apply or Access-confirmation inputs.

A manual run performs, in order:

1. repository/global-health validation;
2. Cloudflare credential and Access-pair guard;
3. derivation of scoped proposal/review credentials from the single Brain root token;
4. full private-runtime preflight;
5. exact private Custom Domain render;
6. read-only remote D1 schema verification;
7. Worker test/check/dry-run;
8. one-shot Worker deploy with all private runtime credentials;
9. deployment-presence verification;
10. health verification with propagation retries;
11. two-layer authentication verification;
12. no-write probes confirming proposal and human-review surfaces are privately enabled;
13. identifier-free commercial preview.

A green run means the private operating surface is live and usable.

## What remains OFF

Even with the complete private runtime online:

- public write = OFF;
- outbound = OFF;
- spend = OFF;
- experiment execution = OFF;
- external collection = OFF;
- `WORKER_ENABLED=false`;
- `KILL_SWITCH=true`.

Proposal materialization and human-review decisions are internal planning/governance capabilities. Enabling their authenticated private endpoints does not authorize publication, outreach, spend or experiment execution.

## Credentials

Normal operation requires only:

- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_API_TOKEN`;
- `MAISON_BRAIN_PRIVATE_URL`;
- `MAISON_BRAIN_CONTROL_TOKEN`;
- `MAISON_CF_ACCESS_CLIENT_ID`;
- `MAISON_CF_ACCESS_CLIENT_SECRET`.

`CLOUDFLARE_READ_API_TOKEN` is optional and preferred for read-only schema inspection.

Proposal and review tokens are derived automatically from `MAISON_BRAIN_CONTROL_TOKEN`; they are not separate operator-managed secrets.

## Diagnostic workflow

`Maison Cloudflare Read-Only Inspect` remains available as a diagnostic tool. It performs no deploy and no D1 mutation. Use it only when the one-button runtime reports a D1/resource problem or when remote state needs to be inspected independently.

## Internal stages

The policy still contains internal stages such as `private_brain_read_candidate`, `proposal_materialization_candidate` and `human_review_decision_candidate` because they are useful for tests and fail-closed policy definitions.

They are **not operator choices** in normal production operation. The one-button workflow deploys the complete private planning/governance surface while preserving the no-public-authority invariants above.

## Stop condition

If the one-button workflow fails, fix the specific failed gate. Do not weaken the guard and do not manually skip forward. A successful run must finish health, boundary and commercial-preview verification.

# Maison JF Oceans Radar — Daily Brief

## What it does

The scheduled workflow reads the canonical D1 database using a Cloudflare API token scoped to **D1:Read**, selects external observations and Ocean memory signals from the previous 24 hours, and sends a plain-text report through Resend. It does not call ChatGPT or the OpenAI API. The D1 queries are SELECT-only; the workflow does not mutate source records or approve/publish Vault content.

The report includes recent Ocean changes, high-relevance/commercial signals, external observations, links in stored citations/evidence roots, and available provider usage/cost summaries. It labels ungrounded observations as exploratory and never treats repeated provider output as independent proof.

## Required GitHub Actions configuration

Add these **repository secrets** (Settings → Secrets and variables → Actions → Secrets):

- `CLOUDFLARE_ACCOUNT_ID`: the existing Cloudflare account ID.
- `CLOUDFLARE_READ_API_TOKEN`: a separate Cloudflare API token with D1:Read only, scoped to the Maison account. Do not reuse a deployment token for the daily report.
- `OCEAN_BRIEFING_RESEND_API_KEY`: a Resend API key limited to email sending.

Add these **repository variables** (Settings → Secrets and variables → Actions → Variables):

- `OCEAN_BRIEFING_EMAIL_TO`: the destination inbox you choose; it is deliberately not hard-coded to the retired ChatGPT email.
- `OCEAN_BRIEFING_EMAIL_FROM`: a sender address verified in Resend.
- `OCEAN_BRIEFING_ENABLED`: leave unset or set to `false` until the first manual dry run passes; set to `true` to enable the daily schedule.

The workflow runs at two UTC ticks because Lisbon changes between UTC and UTC+1. It checks the local time and sends only at 08:00 Europe/Lisbon. The non-matching tick exits without reading D1 or sending mail.

## How to test

1. Open Actions → **Maison JF Oceans Daily Brief** → Run workflow.
2. Keep `dry_run=true`. It performs read-only queries and logs only counts, never the content or recipient. The three sending settings are not required for a dry run.
3. Once the dry run succeeds, verify `OCEAN_BRIEFING_EMAIL_TO` and `OCEAN_BRIEFING_EMAIL_FROM`; confirm the latter is verified in Resend.
4. Set `OCEAN_BRIEFING_ENABLED=true`, then run once manually with `dry_run=false` to send the first real email.
5. From then on, the schedule sends one report per Lisbon local day. Resend's idempotency key protects against duplicate delivery on the same local date.

No report is sent while the enable variable is false. If required credentials are missing, the workflow fails closed.

## Retiring the old ChatGPT identity

The legacy Pages MCP consent flow has been disabled by removing its email allowlist, and the Pages MCP API denies tool calls while no new account is explicitly allowlisted. The private Worker MCP also rejects `maisonjf@proton.me` before any tool operation. This prevents the retired identity from using Maison's MCP routes, even if an old client still retains a connection profile.

This is a server-side cutoff. It does not remove an integration card or revoke an OAuth grant from inside the old ChatGPT account UI; that requires access to that account or the relevant Supabase authorization dashboard. The contact email displayed on public Maison pages is not an authentication credential and has not been removed.

The versioned intelligence configuration has `OPENAI_ENABLED=false`; the briefing itself calls neither ChatGPT nor OpenAI. Any API credential that might separately exist in an OpenAI Platform project must be checked/revoked in that platform independently. A ChatGPT subscription/login and an OpenAI API key are separate things.

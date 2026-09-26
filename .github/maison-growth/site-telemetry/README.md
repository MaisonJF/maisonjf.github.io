# Site telemetry → canonical A2

This surface connects consented structural public-site behaviour to the canonical Maison Growth event boundary.

Flow:

`browser analytics.js → same-origin /api/site-event → private A2 /internal/a2/ingest → A1 events`

The browser never receives the A2 bearer token or Cloudflare Access credentials.

Canonical events:

- `page.view`
- `cta.click`
- `navigation.click`
- `offer.exposure`
- `offer.click`

Only structural metadata from the A2 site contract is forwarded. Link text, form answers, messages, query strings, names, emails, phone numbers and arbitrary free text are not part of the contract.

The browser sends nothing to this path until the existing Maison analytics consent is granted.

The Pages Function is fail-open for the public experience:
- if A2 URL/token are absent, the request is acknowledged as ignored;
- if A2 is disabled or unavailable, the request is acknowledged as ignored;
- public navigation/checkout/contact flows never depend on Growth telemetry.

Private Pages environment variables required for activation:

- `A2_INGEST_URL` — exact HTTPS URL ending in `/internal/a2/ingest`;
- `A2_INGEST_TOKEN` — dedicated private A2 bearer secret;
- optional `A2_CF_ACCESS_CLIENT_ID` + `A2_CF_ACCESS_CLIENT_SECRET` as a complete pair.

Code readiness does not enable A2. The Worker-side `A2_INGEST_API_ENABLED` must also be explicitly enabled after the A2 activation checklist passes.

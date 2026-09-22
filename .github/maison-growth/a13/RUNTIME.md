# A13 runtime activation

Repository completion does not activate external collection.

## Safe activation order

1. Review each provider's current API, terms, data-use rules and pricing immediately before activation.
2. Keep provider secrets in Cloudflare secret storage only; never commit API keys.
3. Activate an explicit provider allowlist, one adapter at a time.
4. Route all fetched material through A13 privacy/provenance/echo controls before A2.
5. Start in `observe_only`; no external output may directly trigger publishing, pricing, checkout, catalogue or permission changes.
6. Use Cloudflare rate limits, per-provider budget caps, retries with backoff and a global kill switch.
7. Keep raw user-contributed material separate from analytical facts; require a consent receipt and support revocation of future raw use.
8. Treat provider/model versions as evidence metadata. A model upgrade is a source change, not an invisible substitution.
9. Store citations where the provider supplies them and re-resolve canonical public sources where permitted.
10. Measure convergence by independent source roots, not by the number of AI brands that repeat the same claim.

## Adapter contract

Every live adapter must return only:

- provider/model identity;
- source class;
- retrieval timestamp;
- prompt/query fingerprint, never secrets;
- response text for privacy review;
- citations/source URLs when available;
- provider request identifier when safe;
- cost/usage metadata when available.

The adapter must not expose credentials, hidden prompts, private user memory, account cookies or private conversations.

## Cloudflare shape

The intended production shape is:

`Cron/Queue → provider adapters → A13 normalizer → A2 collector → D1 → A4 Radar → A5 Brain`

The public Maison site remains fail-open: if all A13 providers fail, the site, Oráculo, checkout and services continue to work.

## "All AIs" means extensible, not blind

A13 is designed so any compatible system can be added through the registry and adapter contract. It must never scrape private interfaces or bypass access controls merely to increase provider count.

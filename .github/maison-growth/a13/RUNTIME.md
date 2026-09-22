# A13 runtime activation

A13.2 contains a production-shaped Cloudflare Worker implementation, but repository completion does **not** provision or activate Cloudflare resources.

## Safe activation order

1. Create a dedicated Growth D1 database.
2. Apply A1→A13 migrations in order to that fresh database.
3. Create `maison-intelligence` and `maison-intelligence-dlq` queues.
4. Copy `workers/maison-intelligence/wrangler.template.jsonc` to a local/deployment `wrangler.jsonc` and insert the real D1 database ID.
5. Keep `WORKER_ENABLED=false` and `KILL_SWITCH=true`.
6. Add provider API keys as Cloudflare Worker **secrets**, never repository variables.
7. Deploy and verify bindings while collection is still disabled.
8. Validate Queue delivery, D1 writes, retries and usage counters with synthetic/provider test traffic.
9. Enable the environment flags only after those checks.
10. Finally turn off the database kill switch while leaving `observe_only=1`.

The first live mode is therefore observation only. External intelligence may create A1 events, A13 observations and A4 map evidence, but may not publish, alter prices, checkout, catalogue, permissions or protected Maison architecture.

## Live Worker shape

`Cron → Queue → provider adapter → A13 privacy/provenance/echo control → A1 event + A13 observation + A4 map_evidence → A5 Brain`

The public Maison site remains fail-open: if all A13 providers fail, the site, Oráculo, checkout and services continue to work.

## Provider rules

Every live adapter may return only:

- provider/model identity;
- source class;
- retrieval timestamp;
- prompt/query fingerprint, never secrets;
- response text for privacy review;
- citations/source URLs when available;
- provider request identifier when safe;
- cost/usage metadata when available.

The adapter must never expose credentials, hidden prompts, private user memory, account cookies or private conversations.

Provider model/version settings are explicit runtime configuration. A provider or model upgrade is treated as a source change, not an invisible substitution.

## Cost and failure controls

Initial defaults are intentionally small:

- one scheduled run per day;
- two territories per run;
- maximum two calls per configured provider per UTC day;
- Queue concurrency of one;
- delayed retries;
- dead-letter queue;
- environment kill switch;
- D1 kill switch.

These caps can be increased only after real usage and cost are inspected.

## Evidence independence

A13 canonicalises cited public URLs before counting evidence. Multiple AI systems repeating the same canonical source count as multiple observations but one independent evidence root.

Ungrounded AI output contributes zero independent roots.

## "All AIs" means extensible, not blind

A13 can add any compatible provider through the registry/adapter contract. It must never scrape private interfaces, bypass access controls or access another platform's private memory merely to increase provider count.

# Maison Growth Engine · A13 External Intelligence Mesh

A13 turns external AI systems and the public web into **sensors, not authorities**.

Its purpose is to let the Maison Oceans receive structured observations from compatible public AI APIs, web-grounded AI responses, public web sources and explicitly user-contributed memory excerpts, then feed privacy-reviewed, provenance-rich evidence into the existing Growth stack.

## Runtime flow

`public web / AI API / user-contributed memory → A13 privacy + provenance + echo control → A1 event + A4 map evidence → A5 Brain`

The Brain remains the interpretation and decision layer. External models never become the Brain and never receive write authority over the Maison.

## A13.2 adds

- live-runtime code for a Cloudflare Worker;
- Cloudflare Cron scheduling and Queue consumption;
- adapters for OpenAI web-grounded responses, Gemini Google Search grounding, Perplexity Sonar and Anthropic Messages;
- provider-agnostic source normalization;
- provenance capture: provider, model, prompt fingerprint, retrieval time, citations and response hash;
- source-root canonicalisation so multiple models repeating the same underlying public source do **not** count as independent confirmation;
- A4 `map_evidence` bridge so privacy-reviewed external language can reach the existing Brain;
- daily provider call caps, retries, dead-letter queue design and two independent kill switches;
- explicit consent contract for user-selected memory/conversation contributions;
- deterministic tests and validation.

## User-contributed memory

A13 does **not** access another platform's private memory, hidden account context or private conversations.

A user may deliberately contribute selected text or an export. Before it enters the Oceans:

1. the user explicitly selects/shares the material;
2. the contribution carries a consent receipt;
3. direct PII is rejected or removed before ingestion;
4. the source is marked `user_contributed_memory`, never `public_web`;
5. identity is not retained as analytical evidence;
6. revocation stops future use of the raw contribution.

The useful unit for the Brain is the human pattern, not the person's identity.

## Echo control

Ten models repeating one Reuters article are one independent root, not ten confirmations.

A13 stores separately:

- model/provider observation count;
- canonical independent evidence-root count;
- grounded vs ungrounded state.

Ungrounded model responses can contribute privacy-reviewed language, hypotheses or query expansion, but their independent evidence count is zero.

## Security boundary

External model output is **untrusted data**. It is never executed as code, configuration, prompt override, permission change or publication instruction.

A13 has no repository write, no public write, no price/checkout/catalogue authority and no access to paid Oráculo text.

## Current state

The runtime code is ready in `workers/maison-intelligence/`, but **no Cloudflare resource, production API credential or live network collection is provisioned by the repository**.

The Worker template ships disabled:

- `WORKER_ENABLED=false`;
- `KILL_SWITCH=true`;
- the A13 D1 migration also creates a database kill switch in the ON state.

That means merging A13.2 cannot itself spend provider credits or start collection.

Run the repository validation with:

```bash
python3 .github/maison-growth/a13/validate_a13.py
```

Activation details are in `RUNTIME.md` and `workers/maison-intelligence/README.md`.

# Maison Growth Engine · A13 External Intelligence Mesh

A13 turns external AI systems and the public web into **sensors**, not authorities.

Its job is to let the Maison Oceans receive structured observations from compatible public AI APIs, web-grounded AI responses, public web sources and explicitly user-contributed memory excerpts, then pass privacy-reviewed, provenance-rich signals into the existing A2 → A4 Radar → A5 Brain pipeline.

## Core flow

`public web / AI API / user-contributed memory → A13 provenance + privacy + echo control → A2 normalized event → A4 Radar → A5 Brain`

The Brain remains the decision layer. External models never become the Brain and never receive write authority over the Maison.

## What A13 adds

- provider-agnostic adapter contract for many AI systems;
- allowlisted provider registry with runtime disabled by default;
- provenance capture: provider, model, prompt fingerprint, retrieval time, citations and response hash;
- source-root canonicalisation so multiple models repeating the same underlying article do **not** count as independent confirmation;
- explicit distinction between grounded evidence and ungrounded model output;
- a consent contract for user-selected memory/conversation contributions;
- privacy rejection before any A2 event is produced;
- deterministic local tests and validator.

## User-contributed memory

A13 does **not** access another platform's private memory, hidden account context or private conversations.

A user may deliberately contribute selected text or an export. Before it enters the Oceans:

1. the user must explicitly select/share the material;
2. the contribution must carry a consent receipt;
3. direct PII is rejected or removed before ingestion;
4. the source is marked `user_contributed`, never `public_web`;
5. identity is not retained as analytical evidence;
6. revocation must stop future use of the raw contribution.

The useful unit for the Brain is the human pattern, not the person's identity.

## Echo control

Ten models repeating one Reuters article are one independent root, not ten confirmations.

A13 canonicalises cited URLs and exposes both:

- `model_observation_count`;
- `independent_evidence_root_count`.

Ungrounded model responses may contribute language, hypotheses or query expansion, but their independent evidence count is zero.

## Security boundary

External model output is untrusted data. It is never executed as code, configuration, prompt override, permission change or publication instruction.

A13 has no repository write, no public write, no price/checkout/catalogue authority and no access to paid Oráculo text.

## Repository state

A13 is repository-ready and runtime-disabled. No API key, Worker, Queue, scheduler or production fetch is created by these files.

Run locally:

```bash
python3 .github/maison-growth/a13/validate_a13.py
```

Runtime activation is documented in `RUNTIME.md`.

# A7 · Decisor + Commercial Discovery

A7 is the first structured decision layer of the Maison Growth Engine. It remains **analysis-only**.

## What it does

- evaluates hard gates before any scoring;
- calculates separate discovery and commercial scores;
- emits structured, explainable decisions with evidence, confidence, rule/model versions and rejected alternatives;
- identifies content, journey, product and positioning gaps;
- recommends an already-existing Maison solution where appropriate;
- creates commercial candidates only as internal proposals requiring human review;
- exposes read-only records for Dashboard A6/successors.

## What it cannot do

A7 cannot publish Oceans, create HTML/URLs, alter CTAs, write navigation/sitemaps/IndexNow, create or modify products/services, change price/discount/promise, touch checkout, read commercial PII or read paid Oráculo content.

A high score can never override a failed hard gate. `propose_promotion` is structurally forbidden in storage unless `hard_gates_passed = 1`.

No Cloudflare runtime is required for repository validation. A8 is not part of this stage.

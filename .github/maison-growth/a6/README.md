# A6 · Dashboard v1

Repository-only, read-only internal dashboard over A3/A4/A5 data contracts.

## What it shows
- Mapa Vivo: needs, intents, assets and solutions.
- Coverage: none, partial, sufficient and redundant.
- Journeys and economic assessments.
- Aggregated Oráculo usage only; never paid reading text.
- Brain clusters, aliases, gaps, candidates and conclusions.
- “Porquê?” explanation with evidence, reason codes, confidence, rule and model versions.
- Explicit provenance labels: observed, inferred, missing and fixture.

## Repository preview
`python serve_local.py`

The preview binds to loopback only and uses fixture data by default. It is not a public deployment target and accepts only GET.

## Future runtime
A protected internal runtime may later use the same view/data contracts with read-only access to Growth data. Authentication and authorization are mandatory before any non-local deployment. No Cloudflare resources are provisioned by A6.

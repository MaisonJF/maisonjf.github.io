# Maison Growth Engine — A0 Contract

Status: A0 baseline and safety contracts.

This directory belongs to the private implementation contract for the Maison Growth Engine. It is not a public-content surface and must never be used as a dependency for the public Maison runtime.

## Baseline

The approved public-site baseline for the start of A0 is Git commit `297c7e629154955b01bc9a31fe57d645bbfd7473` (tree `923e6e3141762cc65a1f9b2b8424688cfe9c64a9`).

The Growth Engine is additive and lateral. If it is unavailable, the existing public Maison — site, Oráculo, products, ebooks, checkout, services, Companhia and B2B — must continue to function.

## Non-negotiable contracts

- No Growth component has general write authority over GitHub or the public site.
- Future public writes must go through the Publisher Gateway.
- Every write action has an explicit allowlist and an explicit denylist.
- Protected infrastructure is denied even when a broad allowlist would otherwise match it.
- Internal candidates are data, not public pages.
- Oracle paid-reading bodies are outside the Growth public-generation corpus.
- Automated CTA experiments may switch only among pre-approved existing destinations and must be reversible.
- No automation may alter price, checkout, commercial promise, paid content, legal policy or product definition.
- Audit history is append-only.
- A high score can never override a hard gate.

## A0 files

- `baseline.json` — immutable starting reference and critical runtime fingerprints.
- `path-policy.json` — repository write boundaries for future automated actions.
- `permissions.json` — component capabilities and data-access separation.
- `event-contract-v1.json` — initial envelope contract for future Growth events.
- `validate_a0.py` — offline validation of these contracts. It is not wired into public deployment or existing workflows.

No current runtime file, workflow, redirect, sitemap, checkout function or public page is modified by A0.

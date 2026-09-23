# Maison Growth Engine · A14 Universal Opportunity + Earned Distribution

A14 is the analysis-only bridge that turns Maison evidence into **commercial opportunity and distribution recommendations** without creating a second Brain, CRM or source of truth.

## Core question

> Where is money the Maison has not yet realised it can earn — using something it already has, creating something new, or combining both?

A14 evaluates the whole Maison solution space: physical products, digital products, services, experiences, B2B, wholesale, white-label, licensing, subscriptions, bundles, partnerships, personalisation, corporate gifting and IP/content licensing.

## Canonical flow

`WORLD → Pre-Brain → A13/A1 evidence → A4/A5 Brain → A7 commercial discovery → A14 opportunity/offer/distribution assessment → A12 human review → A8 experiment → A3 conversion/economics/attribution → A11 learning`

A14 never bypasses an existing stage.

## Data and memory roles

A14 deliberately does **not** copy all Maison knowledge into its own database.

- **A1 + A13 + D1** — canonical event/evidence/provenance and privacy-reviewed external observations.
- **OSIRIS OSINT** — public-world sensor family feeding A13 under its allowlist/cadence controls.
- **Osiris Memory** — private relational/agent/provenance projection. It may mirror A14 relationships after canonical storage; it does not replace A13/D1 evidence.
- **Oceanos** — curated Maison knowledge used as retrieval/context, never as a duplicate event store.
- **Maison Semantic Memory** — semantic retrieval contract (backend remains abstract); similarity is not independent evidence.
- **DuckDB + Polars** — cheap analytical/pre-LLM filtering, aggregation and candidate preparation. They are not the canonical transactional store.
- **A4** — living map/evidence.
- **A5** — interpretation/Brain.
- **A7** — commercial discovery and existing-solution checks.
- **A8** — controlled experiments only.
- **A3** — observed journeys, conversions, revenue, margin and attribution.
- **A11** — append-only learning from observed outcomes.
- **A12** — autonomy, risk, human approval, kill switches and audit.

## Existing-asset-first

Before A14 proposes a new offer it must ask whether an existing Maison solution can satisfy the need by being repositioned, bundled, localised, re-packaged, distributed through a new channel or taken B2B.

New product creation is not the default.

## UNKNOWN is a first-class value

Missing evidence stays missing.

A14 never silently substitutes 0.5, 50%, 500 followers, a conversion rate, a labour price, a backlink value or any other invented value. Unknown inputs reduce confidence. Economic values are calculated only when their required inputs are supported by observed/configured evidence.

## Offer taxonomy versus A3

A14 preserves a rich commercial subtype while mapping to the existing broad A3 solution types. This avoids rewriting A3 history merely to express a new commercial hypothesis.

Examples:

- physical product → `physical_product`
- service / workshop / experience → `service`
- B2B / wholesale / white-label / corporate gifting / licensing / partnership → `b2b`
- ebook → `ebook`
- other digital offers → `future_product`

The richer A14 `offer_type` remains available in evidence/reason metadata.

## Earned Distribution

An amplifier is not assigned a permanent score.

Distribution fit belongs to a context:

`AMPLIFIER × OFFER × MOMENT × STORY/CHANNEL CONTEXT`

A creator can therefore be a strong fit for one Maison offer and a weak fit for another.

A14 stores only an opaque `amplifier_ref` in its transactional assessment tables. Public-profile evidence and provenance remain with A13/evidence systems; relationship projections can live in Osiris Memory. A14 is not a parallel CRM.

## Fit is separate from economics

A strong distribution fit is not reduced simply because product seeding costs money.

A14 separately records:

1. strategic fit + confidence;
2. direct activation costs;
3. expected direct economics, only when evidence-backed;
4. indirect distribution effects;
5. monetised indirect value only when a defensible valuation method and evidence exist.

Backlinks, brand-search lift, secondary press and B2B leads may remain **observed non-monetary effects**.

## Safety / autonomy boundary

A14 may:

- analyse;
- score evidence-backed hypotheses;
- compare existing and new solution paths;
- recommend an activation strategy;
- prepare an internal A12 review payload.

A14 may not:

- contact a person;
- send an email or DM;
- send a product;
- create an affiliate relationship;
- publish;
- alter catalogue/checkout/price;
- spend money;
- activate an external API beyond already-authorised A13 sensing.

All meaningful action remains governed by A12 and existing execution boundaries.

## Repository state

A14 is repository-only and analysis-only. Its migration is D1/SQLite-compatible but applying repository migrations does not activate outbound behaviour, collection, spend or publication.

## Cash & Profit mode

A14 can prioritise fast-cash hypotheses while the full Brain continues to grow.

Historical sunk investment is **not** treated as a target. The commercial objective from this point forward is new money: observed revenue, contribution, margin quality, time-to-cash and repeatability.

Cash performance is measured from **observed A3 economics**, not gross forecasts or expected continuation value. The cash layer prefers evidence-backed opportunities with shorter time-to-cash, lower capital requirement, higher expected contribution and lower human effort. Missing commercial inputs remain UNKNOWN and make a candidate `enrich_data`, not a fabricated ranking.

A14.2 adds append-only lineage bridges:

- A14 → A12 governance/action review;
- A14 → A8 experiment lineage;
- A14 → A3 conversion/economic outcomes;
- A14 → A11 learning records.

These are links, not copies of the other modules' source-of-truth data.

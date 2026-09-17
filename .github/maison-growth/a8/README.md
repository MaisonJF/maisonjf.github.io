# A8 · Experiment Manager

Repository-only implementation of the Maison Growth Engine experiment layer.

A8 can define, simulate, assign, measure, evaluate and prepare deterministic rollback plans for conservative CTA-routing experiments. It cannot write to the public Maison, publish Oceans, mutate CTAs, change catalogue/checkout/price, or execute a rollback.

Core rules:
- experiment hypotheses, populations, variants, metrics, stop rules and outcomes are versioned and auditable;
- variants are limited to routing an eligible CTA slot toward an already-approved existing solution;
- the exact pre-experiment state is snapshotted and hashed before readiness;
- assignment is deterministic over pseudonymous exposure keys and supports unequal splits such as 80/20;
- CTR is distinct from economic value per eligible session;
- incompatible experiments cannot be simultaneously ready/running for the same compatibility scope;
- result states are `success`, `neutral`, `worse`, or `insufficient`;
- public execution and rollback are future Publisher Gateway responsibilities.

No A8 component is required by the public site.

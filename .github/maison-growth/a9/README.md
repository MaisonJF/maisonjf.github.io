# Maison Growth Engine · A9 Publisher Gateway

A9 prepares the **only future repository-writing boundary** for Growth Engine public changes.

Repository state remains `dry_run_only`: there is no production credential, no autonomous publishing, no merge authority and no public side effect. The Gateway receives an already-authorized decision; it never decides what should be published.

Core invariants:
- deny by default and deny overrides allow;
- one isolated branch per `publish_run`;
- exact action-specific allowlists;
- every changed file is validated before any future write;
- protected paths/capabilities are rejected before action allowlists are evaluated;
- `decision_id` is mandatory; `candidate_id`/`experiment_id` are mandatory when the action requires them;
- baseline commit/snapshot, file hashes, validations, Guard result, outcome and rollback are auditable;
- retries are idempotent; overlapping active runs are conflicts;
- rollback is an exact restoration plan, not a semantic rewrite;
- A0–A8 retain no direct public repository write capability.

A9 currently simulates plans and validations only. A later explicit activation must provision a dedicated publisher identity/credential and enable live GitHub operations through a separate runtime adapter.

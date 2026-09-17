# A12 runtime boundary and safe activation order

Nothing external is provisioned in A12.

When explicitly authorized later, activation must be staged in this order:
1. provision a dedicated Growth D1 database and apply A1–A12 migrations in order; verify hashes and invariants;
2. connect read-only source adapters first (A2/A3/A4/A7/A8/A10/A11) and run in `observe_only`;
3. deploy the internal Dashboard v2 behind authenticated access, read-only;
4. deploy scheduler/health runtime with `global_kill_switch=true` and public autonomy disabled;
5. validate idempotency, locking, late/duplicate events, retries, rate limits and circuit breaker under synthetic load;
6. enable `recommend` only, then validate human inbox and audit trails with real data;
7. enable `low_risk_auto` only for an explicit allowlist of internal analytical jobs after confidence/evidence thresholds are met;
8. keep all public-writing actions at `human_approval_required`; do not grant Publisher credentials yet;
9. separately provision the A9 publisher identity with least privilege only after a new explicit approval, test dry-run branches/Guard/rollback, and keep autonomous merge disabled;
10. only after another explicit approval may any narrowly scoped public action be considered, with kill switch, circuit breaker, rate caps, human override and rollback verified.

At every stage, failure of Growth must remain fail-open for the public Maison site and commerce.

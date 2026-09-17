# Maison Growth Engine · A12 Autonomia gradual + Dashboard v2

A12 prepares bounded autonomy without enabling production runtime or public writes.

Repository mode is `simulation_only`. Low-risk, already-authorized **internal** tasks may be simulated automatically when evidence/confidence thresholds pass. Medium/high/critical actions are routed to human review. Public-writing autonomy stays disabled and cannot bypass A0–A11 protections.

Core controls:
- explicit autonomy levels: `observe_only`, `recommend`, `human_approval_required`, `low_risk_auto`, `paused`;
- risk classification before execution;
- evidence/confidence thresholds;
- idempotent scheduled jobs, locks and duplicate suppression;
- global kill switch and circuit breaker;
- rate/volume limits;
- health checks and alerts;
- short prioritized human inbox;
- complete "Porquê?" trace for every action;
- immutable action/result/audit history;
- read-only integration with A7 decisions, A8 experiments, A9 Publisher Gateway, A10 promotion and A11 learning.

No Worker, Queue, D1, binding, production credential or autonomous public publication is activated by A12.

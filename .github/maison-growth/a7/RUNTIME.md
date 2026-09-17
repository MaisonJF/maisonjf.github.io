# A7 runtime boundary

Repository A7 uses deterministic rules and fixtures/tests only. No Worker, Queue, D1 binding, model API or external credential is provisioned.

Future runtime may connect A7 to the Growth Engine D1 and an optional model provider, but the provider remains advisory and cannot override hard gates. The public Maison site must continue to work if all A7 runtime components are unavailable.

Runtime-only validation still pending: D1 concurrency/latency, actual A3–A5 data volumes, external-model latency/failure/version pinning, dashboard live reads, and scheduling/locking of decision runs.

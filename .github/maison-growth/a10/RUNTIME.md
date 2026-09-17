# A10 runtime boundary

No Worker, Queue, D1, GitHub App credential, Cloudflare binding or production publisher credential is provisioned by A10.

Repository validation uses deterministic fixtures and SQLite. Future runtime validation must cover:

1. live A5/A7 candidate and decision reads;
2. D1 transaction/concurrency semantics for state events;
3. real A9 publisher identity and branch-per-run creation;
4. exact diff application in an isolated branch;
5. live Oceans Guard status collection;
6. merge authorisation and production rollback;
7. failure isolation: if Growth runtime is unavailable, the public Maison site remains fully operational.

Until a later explicit activation, `public_write_authorized = 0`, `credential_provisioned = 0` and A10 terminates at `publication_ready`.

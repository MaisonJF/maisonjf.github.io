# Maison Growth Engine · A11 Learning Engine

A11 adds a repository-only, analysis-only learning layer. It ingests structured outcomes from A3 journeys/economics, A7 decisions, A8 experiments and A10 promotions and records reproducible learning without changing public Maison behavior.

Core invariants:
- learning is based on observed outcomes and economic value, not CTR alone;
- every learning record keeps expected-vs-observed context, evidence, reason codes and rule/model versions;
- confidence can be revised as a new append-only learning fact, never by rewriting prior facts;
- repeated patterns are labelled correlation-only unless separately established otherwise;
- sensitive changes become internal proposals requiring human review;
- hard gates, permissions, pricing, checkout, catalogue, paid content, policies, promises, protected architecture and public authorization cannot be self-modified;
- no public write, no autonomous publication and no Cloudflare runtime are activated in A11.

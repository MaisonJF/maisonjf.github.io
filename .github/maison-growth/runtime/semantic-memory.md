# Maison Semantic Memory · pgvector experiment

Maison Semantic Memory is a **rebuildable retrieval projection**, not canonical evidence.

The first runtime experiment uses pgvector because Osiris Memory already requires PostgreSQL and vector support. This reduces operational surface while preserving the Semantic Memory backend abstraction. Qdrant remains a valid experiment only if it later demonstrates a unique operational/retrieval advantage.

## Hard rules

- The embedding model and dimension must be configured explicitly.
- A database refuses to mix different embedding model IDs/dimensions.
- Semantic neighbours are never counted as independent evidence roots.
- Every document retains canonical evidence reference when one exists.
- Paid Oráculo bodies, personal chats and direct/commercial PII are excluded.
- The semantic index may be deleted and rebuilt from canonical/curated sources.
- A semantic hit informs retrieval; it does not create a FACT by itself.

## Database

The observe compose creates a separate `maison_memory` database on the same PostgreSQL/pgvector server used by Osiris infrastructure.

The backend implementation is:

`.github/maison-growth/brain/semantic_pgvector.py`

It accepts an explicit embedding provider implementing:

- `model_id`
- `dimensions`
- `embed(text)`

No embedding model is selected automatically.

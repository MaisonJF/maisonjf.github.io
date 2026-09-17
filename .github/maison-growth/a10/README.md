# A10 · Ocean Promotion

A10 implements the repository-level promotion pipeline for Ocean candidates while remaining **dry-run only**.

The conceptual path is:

`internal_candidate → promotion_candidate → hard gates → promotion_eligible → draft_isolated → validated → Publisher Gateway → Oceans Guard → public`

In A10 the pipeline deliberately stops at `publication_ready`. A real transition to `public` requires a later, explicitly authorised runtime activation of A9 Publisher Gateway credentials. A10 itself has no repository-write capability.

## Safety invariants

- Hard gates run before scoring; a high score never overrides a failed gate.
- At least two independent evidence-source groups are required by default.
- Drafts live only in the Intelligence Plane and carry no public URL, sitemap, IndexNow, navigation or indexing authority.
- Paid Oráculo answer/readings are forbidden inputs and cannot be published or substituted.
- Existing sufficient coverage, duplicate intent or unacceptable cannibalisation resolves away from publication.
- Rejection, archive, reinforcement and alias are valid terminal outcomes.
- Any proposed public diff is only a dry-run request to A9; A10 does not merge or write public files.
- Oceans Guard is mandatory for any future publication path.

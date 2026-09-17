# Explainability / “Porquê?”

A5 conclusions are append-only facts. For each cluster, alias, coverage resolution, gap or candidate, the system records:

- reason codes;
- evidence references and/or an evidence-set hash;
- confidence score independently from the state/action suggestion;
- rule version and semantic provider/model version;
- deterministic input hash;
- source cluster/need/intent identifiers.

Typical reason codes include `semantic_exact`, `semantic_equivalent`, `semantic_ambiguous`, `existing_sufficient_coverage`, `existing_partial_coverage`, `no_public_coverage`, `no_solution_coverage`, `redundant_public_coverage`, `multiple_solution_fit`, `evidence_conflict`, `journey_support` and `economic_support`.

A5 does not turn any conclusion into publication authority.

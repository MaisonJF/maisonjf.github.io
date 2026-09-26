-- Maison Growth Engine · A11.2 canonical learning rule seed
-- Definition hash is SHA-256 of canonical learning-policy.json (sorted keys, compact JSON).

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO rule_versions
  (rule_version_id,family,version_label,definition_hash,definition_json,created_at,created_by,supersedes_rule_version_id)
VALUES
  (
    'rul_e6217bb187b5ef0b6ee371286ed2e1e53e0d',
    'learning',
    'A11.2',
    'e6217bb187b5ef0b6ee371286ed2e1e53e0ddfd10cd16a1cc6c63d18f4ee9675',
    '{"confidence_delta_limits":{"max_decrease":20,"max_increase":15},"economic_priority":true,"feedback_actions":["increase_confidence","decrease_confidence","hold_confidence","observe","review"],"initial_confidence":50,"minimum_economic_observation_count":1,"minimum_observation_count":3,"mode":"analysis_only","neutral_band_basis_points":500,"pattern_detection":{"causal_claims":false,"label":"correlation_only","min_repetitions":3},"policy_version":"A11.2","protected_domains":["hard_gates","permissions","security_policy","pricing","discounts","checkout","catalogue","paid_content","legal_policy","commercial_promises","protected_architecture","public_authorization"],"reason_codes":["ECONOMIC_OUTCOME_ABOVE_EXPECTATION","ECONOMIC_OUTCOME_BELOW_EXPECTATION","ECONOMIC_OUTCOME_WITHIN_NEUTRAL_BAND","INSUFFICIENT_OBSERVATIONS","INSUFFICIENT_ECONOMIC_DATA","CTR_POSITIVE_ECONOMIC_NEGATIVE","CTR_NEGATIVE_ECONOMIC_POSITIVE","CONTRADICTORY_SIGNALS","REPEATED_CORRELATED_PATTERN","EXPECTED_OBSERVED_MATCH","EXPECTED_OBSERVED_DIVERGENCE","SENSITIVE_RULE_CHANGE_REQUIRES_HUMAN"],"sensitive_proposal_execution_authorized":false,"signal_classes":["positive","negative","neutral","insufficient"]}',
    '2026-09-26T00:20:00Z',
    'architecture:a11-runtime',
    NULL
  );

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_a11_rule_version','rul_e6217bb187b5ef0b6ee371286ed2e1e53e0d')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='rul_e6217bb187b5ef0b6ee371286ed2e1e53e0d';

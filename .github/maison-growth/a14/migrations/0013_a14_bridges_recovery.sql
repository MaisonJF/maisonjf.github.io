-- Maison Growth Engine · A14.2 integration bridges + recovery measurement
-- D1 / SQLite-compatible migration 0013.
-- Links A14 to A12/A8/A3/A11 without copying their source-of-truth data.
-- Adds a generic recovery target model; no private target amount is embedded in repository code.

PRAGMA foreign_keys = ON;

CREATE TABLE a14_governance_links (
    governance_link_id TEXT PRIMARY KEY
        CHECK (length(governance_link_id)=40 AND substr(governance_link_id,1,4)='gvl_'),
    opportunity_id TEXT NULL
        REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    distribution_match_id TEXT NULL
        REFERENCES earned_distribution_match_assessments(distribution_match_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    action_id TEXT NOT NULL
        REFERENCES autonomy_action_log(action_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    queue_id TEXT NULL
        REFERENCES autonomy_human_queue(queue_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    linked_at TEXT NOT NULL,
    CHECK (opportunity_id IS NOT NULL OR distribution_match_id IS NOT NULL),
    UNIQUE(action_id,opportunity_id,distribution_match_id)
);

CREATE TABLE a14_experiment_links (
    experiment_link_id TEXT PRIMARY KEY
        CHECK (length(experiment_link_id)=40 AND substr(experiment_link_id,1,4)='axl_'),
    opportunity_id TEXT NULL
        REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    offer_hypothesis_id TEXT NULL
        REFERENCES opportunity_offer_hypotheses(offer_hypothesis_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    distribution_match_id TEXT NULL
        REFERENCES earned_distribution_match_assessments(distribution_match_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    experiment_id TEXT NOT NULL
        REFERENCES experiments(experiment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    experiment_version_id TEXT NULL
        REFERENCES experiment_versions(experiment_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    linkage_kind TEXT NOT NULL
        CHECK (linkage_kind IN ('offer_validation','distribution_validation','journey_validation','cta_validation')),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    linked_at TEXT NOT NULL,
    CHECK (
      opportunity_id IS NOT NULL
      OR offer_hypothesis_id IS NOT NULL
      OR distribution_match_id IS NOT NULL
    ),
    UNIQUE(experiment_id,experiment_version_id,opportunity_id,offer_hypothesis_id,distribution_match_id)
);

CREATE TABLE a14_outcome_links (
    outcome_link_id TEXT PRIMARY KEY
        CHECK (length(outcome_link_id)=40 AND substr(outcome_link_id,1,4)='aol_'),
    opportunity_id TEXT NOT NULL
        REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    offer_hypothesis_id TEXT NULL
        REFERENCES opportunity_offer_hypotheses(offer_hypothesis_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    distribution_match_id TEXT NULL
        REFERENCES earned_distribution_match_assessments(distribution_match_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    conversion_id TEXT NOT NULL
        REFERENCES conversions(conversion_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    economic_assessment_id TEXT NULL
        REFERENCES conversion_economic_assessments(economic_assessment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    attribution_role TEXT NOT NULL
        CHECK (attribution_role IN ('direct','assisted','contextual')),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    linked_at TEXT NOT NULL,
    UNIQUE(opportunity_id,offer_hypothesis_id,distribution_match_id,conversion_id,attribution_role)
);

CREATE INDEX idx_a14_outcomes_opportunity
    ON a14_outcome_links(opportunity_id,linked_at);
CREATE INDEX idx_a14_outcomes_conversion
    ON a14_outcome_links(conversion_id,linked_at);

CREATE TABLE a14_learning_links (
    learning_link_id TEXT PRIMARY KEY
        CHECK (length(learning_link_id)=40 AND substr(learning_link_id,1,4)='all_'),
    opportunity_id TEXT NOT NULL
        REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    offer_hypothesis_id TEXT NULL
        REFERENCES opportunity_offer_hypotheses(offer_hypothesis_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    distribution_match_id TEXT NULL
        REFERENCES earned_distribution_match_assessments(distribution_match_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    learning_record_id TEXT NOT NULL
        REFERENCES learning_records(learning_record_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    linked_at TEXT NOT NULL,
    UNIQUE(opportunity_id,offer_hypothesis_id,distribution_match_id,learning_record_id)
);

CREATE TABLE recovery_target_versions (
    recovery_target_version_id TEXT PRIMARY KEY
        CHECK (length(recovery_target_version_id)=40 AND substr(recovery_target_version_id,1,4)='rtv_'),
    target_key TEXT NOT NULL CHECK (length(trim(target_key)) BETWEEN 1 AND 120),
    target_amount_minor INTEGER NOT NULL CHECK (target_amount_minor > 0),
    currency TEXT NOT NULL
        CHECK (length(currency)=3 AND currency=upper(currency) AND currency NOT GLOB '*[^A-Z]*'),
    basis TEXT NOT NULL CHECK (basis='a3_immediate_contribution'),
    valid_from TEXT NOT NULL,
    valid_to TEXT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) BETWEEN 1 AND 120),
    notes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(notes_json)),
    CHECK (valid_to IS NULL OR valid_to > valid_from),
    UNIQUE(target_key,valid_from)
);

CREATE VIEW a14_realised_economics AS
SELECT
    l.opportunity_id,
    l.offer_hypothesis_id,
    l.distribution_match_id,
    l.conversion_id,
    l.economic_assessment_id,
    l.attribution_role,
    c.solution_id,
    c.occurred_at,
    c.revenue_minor,
    c.currency,
    e.variable_cost_minor,
    e.human_effort_cost_minor,
    e.immediate_contribution_minor,
    e.repeatability_class,
    e.confidence_class
FROM a14_outcome_links l
JOIN conversions c ON c.conversion_id=l.conversion_id
LEFT JOIN conversion_economic_assessments e
  ON e.economic_assessment_id=l.economic_assessment_id;

CREATE INDEX idx_a14_governance_action ON a14_governance_links(action_id,linked_at);
CREATE INDEX idx_a14_experiment_exp ON a14_experiment_links(experiment_id,linked_at);
CREATE INDEX idx_a14_learning_record ON a14_learning_links(learning_record_id,linked_at);

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_a14_schema_version','A14.2')
ON CONFLICT(schema_key) DO UPDATE SET schema_value='A14.2';

CREATE TRIGGER trg_a14_governance_no_update BEFORE UPDATE ON a14_governance_links BEGIN SELECT RAISE(ABORT,'A14 governance links are append-only'); END;
CREATE TRIGGER trg_a14_governance_no_delete BEFORE DELETE ON a14_governance_links BEGIN SELECT RAISE(ABORT,'A14 governance links are append-only'); END;
CREATE TRIGGER trg_a14_experiment_links_no_update BEFORE UPDATE ON a14_experiment_links BEGIN SELECT RAISE(ABORT,'A14 experiment links are append-only'); END;
CREATE TRIGGER trg_a14_experiment_links_no_delete BEFORE DELETE ON a14_experiment_links BEGIN SELECT RAISE(ABORT,'A14 experiment links are append-only'); END;
CREATE TRIGGER trg_a14_outcome_links_no_update BEFORE UPDATE ON a14_outcome_links BEGIN SELECT RAISE(ABORT,'A14 outcome links are append-only'); END;
CREATE TRIGGER trg_a14_outcome_links_no_delete BEFORE DELETE ON a14_outcome_links BEGIN SELECT RAISE(ABORT,'A14 outcome links are append-only'); END;
CREATE TRIGGER trg_a14_learning_links_no_update BEFORE UPDATE ON a14_learning_links BEGIN SELECT RAISE(ABORT,'A14 learning links are append-only'); END;
CREATE TRIGGER trg_a14_learning_links_no_delete BEFORE DELETE ON a14_learning_links BEGIN SELECT RAISE(ABORT,'A14 learning links are append-only'); END;
CREATE TRIGGER trg_recovery_targets_no_update BEFORE UPDATE ON recovery_target_versions BEGIN SELECT RAISE(ABORT,'Recovery targets are versioned; insert a new version'); END;
CREATE TRIGGER trg_recovery_targets_no_delete BEFORE DELETE ON recovery_target_versions BEGIN SELECT RAISE(ABORT,'Recovery target history is immutable'); END;

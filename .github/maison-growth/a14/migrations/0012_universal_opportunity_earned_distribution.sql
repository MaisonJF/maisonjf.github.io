-- Maison Growth Engine · A14 Universal Opportunity + Earned Distribution
-- D1 / SQLite-compatible migration 0012.
-- Depends on A1.1 + A3.1 + A4.1 + A5.1 + A7.1 + A8.1 + A11.1 + A12.1 + A13.2.
-- Repository-only / analysis-only. Creates no outbound execution authority.

PRAGMA foreign_keys = ON;

CREATE TABLE opportunity_hypotheses (
    opportunity_id TEXT PRIMARY KEY
        CHECK (length(opportunity_id)=40 AND substr(opportunity_id,1,4)='opp_'),
    need_id TEXT NULL REFERENCES needs(need_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    territory_code TEXT NULL,
    opportunity_score REAL NULL CHECK (opportunity_score IS NULL OR opportunity_score BETWEEN 0 AND 100),
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    known_dimensions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(known_dimensions_json)),
    unknown_dimensions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(unknown_dimensions_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    existing_solution_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(existing_solution_ids_json)),
    knowledge_context_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(knowledge_context_refs_json)),
    status TEXT NOT NULL
        CHECK (status IN ('observe','recommend','human_review_required','rejected','archived')),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    rule_version_id TEXT NOT NULL,
    model_version_id TEXT NULL,
    input_hash TEXT NOT NULL CHECK (length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
    created_at TEXT NOT NULL,
    UNIQUE(input_hash, rule_version_id, model_version_id)
);

CREATE TABLE opportunity_offer_hypotheses (
    offer_hypothesis_id TEXT PRIMARY KEY
        CHECK (length(offer_hypothesis_id)=40 AND substr(offer_hypothesis_id,1,4)='ofh_'),
    opportunity_id TEXT NOT NULL REFERENCES opportunity_hypotheses(opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    offer_type TEXT NOT NULL CHECK (offer_type IN (
        'physical_product','digital_product','ebook','service','workshop','experience',
        'b2b','wholesale','white_label','licensing','subscription','bundle',
        'partnership','personalisation','corporate_gifting','ip_content_licensing','oracle'
    )),
    a3_solution_type TEXT NOT NULL CHECK (a3_solution_type IN (
        'oracle','physical_product','service','ebook','b2b','company','digital_collection','future_product'
    )),
    existing_solution_id TEXT NULL REFERENCES solutions(solution_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    fit_score REAL NULL CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100),
    fit_confidence REAL NOT NULL CHECK (fit_confidence BETWEEN 0 AND 1),
    economics_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(economics_json)),
    validation_mode TEXT NULL,
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    reason_codes_json TEXT NOT NULL CHECK (json_valid(reason_codes_json)),
    human_review_required INTEGER NOT NULL DEFAULT 1 CHECK (human_review_required=1),
    launch_authorized INTEGER NOT NULL DEFAULT 0 CHECK (launch_authorized=0),
    price_authorized INTEGER NOT NULL DEFAULT 0 CHECK (price_authorized=0),
    public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK (public_side_effects=0),
    created_at TEXT NOT NULL
);

CREATE TABLE earned_distribution_match_assessments (
    distribution_match_id TEXT PRIMARY KEY
        CHECK (length(distribution_match_id)=40 AND substr(distribution_match_id,1,4)='dma_'),
    offer_hypothesis_id TEXT NOT NULL REFERENCES opportunity_offer_hypotheses(offer_hypothesis_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    amplifier_ref TEXT NOT NULL,
    moment_key TEXT NOT NULL,
    story_angle_key TEXT NULL,
    channel_class TEXT NOT NULL,
    fit_score REAL NULL CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100),
    fit_confidence REAL NOT NULL CHECK (fit_confidence BETWEEN 0 AND 1),
    known_dimensions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(known_dimensions_json)),
    unknown_dimensions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(unknown_dimensions_json)),
    evidence_refs_json TEXT NOT NULL CHECK (json_valid(evidence_refs_json)),
    economics_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(economics_json)),
    recommended_strategy TEXT NOT NULL CHECK (recommended_strategy IN (
        'zero_cash_story','pr_editorial','product_seeding','affiliate','revenue_share',
        'barter','partnership','b2b','observe','no_action'
    )),
    recommendation_state TEXT NOT NULL CHECK (recommendation_state IN ('observe','enrich_data','recommend','rejected')),
    a12_review_ref TEXT NULL,
    experiment_id TEXT NULL REFERENCES experiments(experiment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    outbound_authorized INTEGER NOT NULL DEFAULT 0 CHECK (outbound_authorized=0),
    spend_authorized INTEGER NOT NULL DEFAULT 0 CHECK (spend_authorized=0),
    created_at TEXT NOT NULL
);

CREATE TABLE distribution_value_observations (
    distribution_observation_id TEXT PRIMARY KEY
        CHECK (length(distribution_observation_id)=40 AND substr(distribution_observation_id,1,4)='dvo_'),
    distribution_match_id TEXT NOT NULL REFERENCES earned_distribution_match_assessments(distribution_match_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    source_event_id TEXT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    direct_revenue_minor INTEGER NULL CHECK (direct_revenue_minor IS NULL OR direct_revenue_minor >= 0),
    direct_margin_minor INTEGER NULL,
    currency TEXT NULL CHECK (currency IS NULL OR (length(currency)=3 AND currency=upper(currency))),
    backlinks_observed INTEGER NULL CHECK (backlinks_observed IS NULL OR backlinks_observed >= 0),
    brand_search_delta REAL NULL,
    direct_visits_delta INTEGER NULL,
    b2b_leads_observed INTEGER NULL CHECK (b2b_leads_observed IS NULL OR b2b_leads_observed >= 0),
    secondary_mentions_observed INTEGER NULL CHECK (secondary_mentions_observed IS NULL OR secondary_mentions_observed >= 0),
    monetized_indirect_value_minor INTEGER NULL,
    valuation_method TEXT NULL,
    attribution_confidence REAL NULL CHECK (attribution_confidence IS NULL OR attribution_confidence BETWEEN 0 AND 1),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
    observed_at TEXT NOT NULL
);

CREATE INDEX idx_a14_opportunity_status ON opportunity_hypotheses(status,created_at);
CREATE INDEX idx_a14_offer_opportunity ON opportunity_offer_hypotheses(opportunity_id,offer_type);
CREATE INDEX idx_a14_distribution_context ON earned_distribution_match_assessments(amplifier_ref,moment_key,created_at);
CREATE INDEX idx_a14_distribution_offer ON earned_distribution_match_assessments(offer_hypothesis_id,created_at);

INSERT INTO schema_state(schema_key,schema_value)
VALUES ('maison_growth_a14_schema_version','A14.1');

CREATE TRIGGER trg_a14_opportunity_no_update BEFORE UPDATE ON opportunity_hypotheses BEGIN SELECT RAISE(ABORT,'A14 opportunity hypotheses are append-only'); END;
CREATE TRIGGER trg_a14_opportunity_no_delete BEFORE DELETE ON opportunity_hypotheses BEGIN SELECT RAISE(ABORT,'A14 opportunity hypotheses are append-only'); END;
CREATE TRIGGER trg_a14_offer_no_update BEFORE UPDATE ON opportunity_offer_hypotheses BEGIN SELECT RAISE(ABORT,'A14 offer hypotheses are append-only'); END;
CREATE TRIGGER trg_a14_offer_no_delete BEFORE DELETE ON opportunity_offer_hypotheses BEGIN SELECT RAISE(ABORT,'A14 offer hypotheses are append-only'); END;
CREATE TRIGGER trg_a14_match_no_update BEFORE UPDATE ON earned_distribution_match_assessments BEGIN SELECT RAISE(ABORT,'A14 distribution assessments are append-only'); END;
CREATE TRIGGER trg_a14_match_no_delete BEFORE DELETE ON earned_distribution_match_assessments BEGIN SELECT RAISE(ABORT,'A14 distribution assessments are append-only'); END;
CREATE TRIGGER trg_a14_value_no_update BEFORE UPDATE ON distribution_value_observations BEGIN SELECT RAISE(ABORT,'A14 distribution observations are append-only'); END;
CREATE TRIGGER trg_a14_value_no_delete BEFORE DELETE ON distribution_value_observations BEGIN SELECT RAISE(ABORT,'A14 distribution observations are append-only'); END;

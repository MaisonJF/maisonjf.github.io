-- 0023: MAISON Candidate Inbox + zero-cost Foundry provenance
-- Private D1 proposals only. Nothing in this schema grants publication, pricing,
-- catalogue, checkout or activation authority.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS maison_candidate_inbox (
  candidate_id TEXT PRIMARY KEY
    CHECK(length(candidate_id)=40 AND substr(candidate_id,1,4)='mci_'),
  candidate_type TEXT NOT NULL CHECK(candidate_type IN (
    'question','oracle_block','test','farol_path',
    'reel','post','story','carousel','video_script',
    'physical_product','digital_product','bundle','service','experience',
    'ebook','campaign','b2b','seasonal_offer','experiment'
  )),
  source_ocean_id TEXT NOT NULL CHECK(length(trim(source_ocean_id)) BETWEEN 2 AND 160),
  source_observation_id TEXT NULL,
  provider_id TEXT NOT NULL CHECK(length(trim(provider_id)) BETWEEN 1 AND 120),
  model_id TEXT NULL CHECK(model_id IS NULL OR length(trim(model_id)) BETWEEN 1 AND 240),
  territory TEXT NOT NULL CHECK(length(trim(territory)) BETWEEN 1 AND 120),
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
  body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
  rationale TEXT NOT NULL CHECK(length(trim(rationale)) BETWEEN 1 AND 2000),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(payload_json)),
  evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(evidence_refs_json)),
  related_assets_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(related_assets_json)),
  novelty_score INTEGER NOT NULL DEFAULT 50 CHECK(novelty_score BETWEEN 0 AND 100),
  maison_fit_score INTEGER NOT NULL DEFAULT 50 CHECK(maison_fit_score BETWEEN 0 AND 100),
  feasibility_score INTEGER NOT NULL DEFAULT 50 CHECK(feasibility_score BETWEEN 0 AND 100),
  demand_score INTEGER NOT NULL DEFAULT 50 CHECK(demand_score BETWEEN 0 AND 100),
  commercial_score INTEGER NOT NULL DEFAULT 50 CHECK(commercial_score BETWEEN 0 AND 100),
  reuse_existing_score INTEGER NOT NULL DEFAULT 50 CHECK(reuse_existing_score BETWEEN 0 AND 100),
  semantic_fingerprint TEXT NOT NULL
    CHECK(length(semantic_fingerprint)=64 AND semantic_fingerprint NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'candidate' CHECK(status='candidate'),
  lifecycle_state TEXT NOT NULL DEFAULT 'candidate' CHECK(lifecycle_state='candidate'),
  rotation_state TEXT NOT NULL DEFAULT 'new' CHECK(rotation_state='new'),
  human_review_required INTEGER NOT NULL DEFAULT 1 CHECK(human_review_required=1),
  automatic_activation INTEGER NOT NULL DEFAULT 0 CHECK(automatic_activation=0),
  public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK(public_side_effects=0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(candidate_type,semantic_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_maison_candidate_inbox_review
  ON maison_candidate_inbox(rotation_state,candidate_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maison_candidate_inbox_ocean
  ON maison_candidate_inbox(source_ocean_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maison_candidate_inbox_provider
  ON maison_candidate_inbox(provider_id,model_id,created_at DESC);

CREATE TABLE IF NOT EXISTS maison_candidate_decisions (
  decision_id TEXT PRIMARY KEY
    CHECK(length(decision_id)=40 AND substr(decision_id,1,4)='mcd_'),
  candidate_id TEXT NOT NULL REFERENCES maison_candidate_inbox(candidate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  decision TEXT NOT NULL CHECK(decision IN ('approve','reject','archive','defer','develop')),
  reason TEXT NOT NULL DEFAULT '' CHECK(length(reason)<=2000),
  actor TEXT NOT NULL DEFAULT 'human' CHECK(length(trim(actor)) BETWEEN 1 AND 120),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_maison_candidate_decisions_candidate
  ON maison_candidate_decisions(candidate_id,created_at DESC);

CREATE VIEW IF NOT EXISTS maison_candidate_review_queue AS
SELECT
  c.*,
  (
    SELECT d.decision
    FROM maison_candidate_decisions d
    WHERE d.candidate_id=c.candidate_id
    ORDER BY d.created_at DESC,d.decision_id DESC
    LIMIT 1
  ) AS latest_decision,
  (
    SELECT d.created_at
    FROM maison_candidate_decisions d
    WHERE d.candidate_id=c.candidate_id
    ORDER BY d.created_at DESC,d.decision_id DESC
    LIMIT 1
  ) AS latest_decision_at
FROM maison_candidate_inbox c;

CREATE TRIGGER IF NOT EXISTS trg_maison_candidate_inbox_no_update
BEFORE UPDATE ON maison_candidate_inbox
BEGIN SELECT RAISE(ABORT,'Candidate proposals are immutable; append a decision.'); END;

CREATE TRIGGER IF NOT EXISTS trg_maison_candidate_inbox_no_delete
BEFORE DELETE ON maison_candidate_inbox
BEGIN SELECT RAISE(ABORT,'Candidate proposals are immutable.'); END;

CREATE TRIGGER IF NOT EXISTS trg_maison_candidate_decisions_no_update
BEFORE UPDATE ON maison_candidate_decisions
BEGIN SELECT RAISE(ABORT,'Candidate decisions are append-only.'); END;

CREATE TRIGGER IF NOT EXISTS trg_maison_candidate_decisions_no_delete
BEFORE DELETE ON maison_candidate_decisions
BEGIN SELECT RAISE(ABORT,'Candidate decisions are append-only.'); END;

INSERT INTO schema_state(schema_key,schema_value)
VALUES('maison_candidate_inbox_schema_version','CANDIDATE.1')
ON CONFLICT(schema_key) DO UPDATE SET schema_value=excluded.schema_value;

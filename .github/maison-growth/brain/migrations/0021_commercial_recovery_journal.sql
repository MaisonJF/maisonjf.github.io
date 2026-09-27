-- 0021: durable commercial recovery journal
-- Preservation only. This table is not a product/service catalogue and grants no execution authority.
CREATE TABLE IF NOT EXISTS commercial_recovery_journal (
  recovery_id TEXT PRIMARY KEY CHECK (length(recovery_id) >= 20),
  kind TEXT NOT NULL CHECK (kind IN ('product_candidate','service_candidate','digital_candidate','bundle_candidate','commercial_opportunity','ocean_integration')),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  intended_destination TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'captured' CHECK (state IN ('captured','pending_write','integrated','superseded','rejected')),
  source_ref TEXT NULL,
  evidence_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_refs_json)),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT NULL,
  integrated_ref TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commercial_recovery_unresolved
ON commercial_recovery_journal(state, updated_at)
WHERE state IN ('captured','pending_write');

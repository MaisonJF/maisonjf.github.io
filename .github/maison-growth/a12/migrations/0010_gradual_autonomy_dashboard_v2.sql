-- Maison Growth Engine · A12 Gradual Autonomy + Dashboard v2
-- D1 / SQLite-compatible migration 0010. No public runtime dependency.
PRAGMA foreign_keys = ON;

CREATE TABLE autonomy_job_definitions (
  autonomy_job_id TEXT PRIMARY KEY CHECK(length(autonomy_job_id)=40 AND substr(autonomy_job_id,1,4)='job_'),
  job_key TEXT NOT NULL UNIQUE,
  action_key TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK(risk_class IN ('low','medium','high','critical')),
  autonomy_level TEXT NOT NULL CHECK(autonomy_level IN ('observe_only','recommend','human_approval_required','low_risk_auto','paused')),
  schedule_key TEXT NOT NULL,
  min_evidence_count INTEGER NOT NULL CHECK(min_evidence_count>=0),
  min_confidence_score INTEGER NOT NULL CHECK(min_confidence_score BETWEEN 0 AND 100),
  max_actions_per_window INTEGER NOT NULL CHECK(max_actions_per_window>=1),
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  model_version_id TEXT NULL REFERENCES model_versions(model_version_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at TEXT NOT NULL,
  CHECK(autonomy_level<>'low_risk_auto' OR risk_class='low')
);

CREATE TABLE autonomy_job_runs (
  autonomy_run_id TEXT PRIMARY KEY CHECK(length(autonomy_run_id)=40 AND substr(autonomy_run_id,1,4)='arn_'),
  autonomy_job_id TEXT NOT NULL REFERENCES autonomy_job_definitions(autonomy_job_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  scheduled_for TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE CHECK(length(idempotency_key)=64),
  status TEXT NOT NULL CHECK(status IN ('analysis_only','queued_for_human','simulated_completed','blocked','failed','paused')),
  evidence_refs_json TEXT NOT NULL CHECK(json_valid(evidence_refs_json)),
  confidence_score INTEGER NOT NULL CHECK(confidence_score BETWEEN 0 AND 100),
  reason_codes_json TEXT NOT NULL CHECK(json_valid(reason_codes_json)),
  public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK(public_write_authorized=0),
  public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK(public_side_effects=0),
  created_at TEXT NOT NULL,
  UNIQUE(autonomy_job_id,scheduled_for)
);

CREATE TABLE autonomy_lock_events (
  lock_event_id TEXT PRIMARY KEY CHECK(length(lock_event_id)=40 AND substr(lock_event_id,1,4)='lck_'),
  lock_key TEXT NOT NULL,
  token_hash TEXT NOT NULL CHECK(length(token_hash)=64),
  event_type TEXT NOT NULL CHECK(event_type IN ('claimed','released','conflict')),
  autonomy_run_id TEXT NULL REFERENCES autonomy_job_runs(autonomy_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE autonomy_state_events (
  autonomy_state_event_id TEXT PRIMARY KEY CHECK(length(autonomy_state_event_id)=40 AND substr(autonomy_state_event_id,1,4)='ase_'),
  state_key TEXT NOT NULL CHECK(state_key IN ('global_kill_switch','circuit_breaker','public_autonomy')),
  state_value TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK(actor_kind IN ('system_simulation','human','future_runtime')),
  occurred_at TEXT NOT NULL,
  CHECK(state_key<>'public_autonomy' OR state_value IN ('disabled','human_only'))
);

CREATE TABLE autonomy_action_log (
  action_id TEXT PRIMARY KEY CHECK(length(action_id)=40 AND substr(action_id,1,4)='act_'),
  autonomy_run_id TEXT NULL REFERENCES autonomy_job_runs(autonomy_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  action_key TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK(risk_class IN ('low','medium','high','critical')),
  autonomy_level TEXT NOT NULL CHECK(autonomy_level IN ('observe_only','recommend','human_approval_required','low_risk_auto','paused')),
  decision_id TEXT NULL REFERENCES decision_records(decision_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  experiment_result_id TEXT NULL REFERENCES experiment_results(experiment_result_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  publish_run_id TEXT NULL REFERENCES publish_runs(publish_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  promotion_run_id TEXT NULL REFERENCES ocean_promotion_runs(promotion_run_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  learning_record_id TEXT NULL REFERENCES learning_records(learning_record_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  evidence_refs_json TEXT NOT NULL CHECK(json_valid(evidence_refs_json)),
  reason_codes_json TEXT NOT NULL CHECK(json_valid(reason_codes_json)),
  result_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result_json)),
  rollback_ref TEXT NULL,
  public_write_authorized INTEGER NOT NULL DEFAULT 0 CHECK(public_write_authorized=0),
  public_side_effects INTEGER NOT NULL DEFAULT 0 CHECK(public_side_effects=0),
  created_at TEXT NOT NULL,
  CHECK(autonomy_level<>'low_risk_auto' OR risk_class='low')
);

CREATE TABLE autonomy_human_queue (
  queue_id TEXT PRIMARY KEY CHECK(length(queue_id)=40 AND substr(queue_id,1,4)='inq_'),
  action_id TEXT NOT NULL REFERENCES autonomy_action_log(action_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','expired')),
  reason_codes_json TEXT NOT NULL CHECK(json_valid(reason_codes_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE autonomy_health_checks (
  health_check_id TEXT PRIMARY KEY CHECK(length(health_check_id)=40 AND substr(health_check_id,1,4)='hlh_'),
  component_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('healthy','degraded','failed','paused')),
  details_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details_json)),
  observed_at TEXT NOT NULL
);

CREATE TABLE autonomy_alerts (
  alert_id TEXT PRIMARY KEY CHECK(length(alert_id)=40 AND substr(alert_id,1,4)='alr_'),
  severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','critical')),
  alert_code TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details_json)),
  occurred_at TEXT NOT NULL
);

INSERT INTO schema_state(schema_key,schema_value) VALUES('maison_growth_a12_schema_version','A12.1');

CREATE TRIGGER trg_a12_jobs_no_update BEFORE UPDATE ON autonomy_job_definitions BEGIN SELECT RAISE(ABORT,'A12 jobs are immutable; version with a new row'); END;
CREATE TRIGGER trg_a12_jobs_no_delete BEFORE DELETE ON autonomy_job_definitions BEGIN SELECT RAISE(ABORT,'A12 jobs are immutable'); END;
CREATE TRIGGER trg_a12_runs_no_update BEFORE UPDATE ON autonomy_job_runs BEGIN SELECT RAISE(ABORT,'A12 runs are immutable'); END;
CREATE TRIGGER trg_a12_runs_no_delete BEFORE DELETE ON autonomy_job_runs BEGIN SELECT RAISE(ABORT,'A12 runs are immutable'); END;
CREATE TRIGGER trg_a12_actions_no_update BEFORE UPDATE ON autonomy_action_log BEGIN SELECT RAISE(ABORT,'A12 action log is immutable'); END;
CREATE TRIGGER trg_a12_actions_no_delete BEFORE DELETE ON autonomy_action_log BEGIN SELECT RAISE(ABORT,'A12 action log is immutable'); END;
CREATE TRIGGER trg_a12_queue_no_update BEFORE UPDATE ON autonomy_human_queue BEGIN SELECT RAISE(ABORT,'A12 queue history is append-only; append resolution event in future runtime'); END;
CREATE TRIGGER trg_a12_queue_no_delete BEFORE DELETE ON autonomy_human_queue BEGIN SELECT RAISE(ABORT,'A12 queue is immutable'); END;

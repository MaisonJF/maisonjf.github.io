-- SOS Maison JF® · operational core v1
-- Separate product-operational D1 domain. This schema must never be attached to the Maison Brain DB.
PRAGMA foreign_keys = ON;

CREATE TABLE sos_accounts (
  account_ref TEXT PRIMARY KEY
    CHECK (length(account_ref)=40 AND substr(account_ref,1,4)='sua_'),
  timezone TEXT NOT NULL CHECK (length(timezone) BETWEEN 1 AND 80),
  cadence_hours INTEGER NOT NULL DEFAULT 24 CHECK (cadence_hours=24),
  grace_minutes INTEGER NOT NULL DEFAULT 60 CHECK (grace_minutes BETWEEN 15 AND 240),
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup','active','paused','deleted')),
  activated_at TEXT NULL,
  paused_at TEXT NULL,
  deleted_at TEXT NULL,
  next_due_at TEXT NULL,
  last_checkin_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE sos_trusted_contacts (
  contact_ref TEXT PRIMARY KEY
    CHECK (length(contact_ref)=40 AND substr(contact_ref,1,4)='sct_'),
  account_ref TEXT NOT NULL REFERENCES sos_accounts(account_ref) ON DELETE CASCADE,
  endpoint_kind TEXT NOT NULL CHECK (endpoint_kind IN ('email','phone')),
  endpoint_ciphertext TEXT NOT NULL CHECK (length(endpoint_ciphertext)>=16),
  endpoint_iv TEXT NOT NULL CHECK (length(endpoint_iv)>=12),
  crypto_version TEXT NOT NULL DEFAULT 'aes-gcm-v1' CHECK (crypto_version='aes-gcm-v1'),
  verified_at TEXT NULL,
  revoked_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX idx_sos_one_live_contact
  ON sos_trusted_contacts(account_ref)
  WHERE revoked_at IS NULL;

CREATE TABLE sos_contact_invites (
  invite_ref TEXT PRIMARY KEY
    CHECK (length(invite_ref)=40 AND substr(invite_ref,1,4)='sin_'),
  contact_ref TEXT NOT NULL REFERENCES sos_trusted_contacts(contact_ref) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE
    CHECK (length(token_hash)=64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  expires_at TEXT NOT NULL,
  accepted_at TEXT NULL,
  revoked_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_sos_invites_contact
  ON sos_contact_invites(contact_ref,expires_at);

CREATE TABLE sos_due_windows (
  due_ref TEXT PRIMARY KEY
    CHECK (length(due_ref)=40 AND substr(due_ref,1,4)='sdw_'),
  account_ref TEXT NOT NULL REFERENCES sos_accounts(account_ref) ON DELETE CASCADE,
  due_at TEXT NOT NULL,
  grace_until_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open','checked_in','notified','cancelled')),
  completed_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(account_ref,due_at)
);

CREATE INDEX idx_sos_due_open
  ON sos_due_windows(state,due_at,grace_until_at);

CREATE TABLE sos_checkins (
  checkin_ref TEXT PRIMARY KEY
    CHECK (length(checkin_ref)=40 AND substr(checkin_ref,1,4)='sci_'),
  account_ref TEXT NOT NULL REFERENCES sos_accounts(account_ref) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 120),
  due_ref_before TEXT NULL REFERENCES sos_due_windows(due_ref) ON DELETE SET NULL,
  due_ref_after TEXT NOT NULL REFERENCES sos_due_windows(due_ref) ON DELETE RESTRICT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(account_ref,idempotency_key)
);

CREATE TABLE sos_outbox (
  action_ref TEXT PRIMARY KEY
    CHECK (length(action_ref)=40 AND substr(action_ref,1,4)='soa_'),
  due_ref TEXT NOT NULL REFERENCES sos_due_windows(due_ref) ON DELETE CASCADE,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('user_reminder','trusted_notice')),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','claimed','sent','failed','cancelled')),
  not_before TEXT NOT NULL,
  claim_expires_at TEXT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20),
  provider_receipt_ref TEXT NULL CHECK (provider_receipt_ref IS NULL OR length(provider_receipt_ref)<=300),
  last_error_code TEXT NULL CHECK (last_error_code IS NULL OR length(last_error_code)<=120),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sent_at TEXT NULL,
  UNIQUE(due_ref,action_kind)
);

CREATE INDEX idx_sos_outbox_dispatch
  ON sos_outbox(state,not_before,created_at);

CREATE TABLE sos_schema_state (
  schema_key TEXT PRIMARY KEY,
  schema_value TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) WITHOUT ROWID;

INSERT INTO sos_schema_state(schema_key,schema_value)
VALUES ('sos_operational_schema_version','SOS.OP.1');

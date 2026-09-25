-- SOS Maison JF® · verified user reminder channel
PRAGMA foreign_keys = ON;

CREATE TABLE sos_user_channels (
  channel_ref TEXT PRIMARY KEY
    CHECK (length(channel_ref)=40 AND substr(channel_ref,1,4)='suc_'),
  account_ref TEXT NOT NULL REFERENCES sos_accounts(account_ref) ON DELETE CASCADE,
  endpoint_kind TEXT NOT NULL CHECK (endpoint_kind='email'),
  endpoint_ciphertext TEXT NOT NULL CHECK (length(endpoint_ciphertext)>=16),
  endpoint_iv TEXT NOT NULL CHECK (length(endpoint_iv)>=12),
  crypto_version TEXT NOT NULL DEFAULT 'aes-gcm-v1' CHECK (crypto_version='aes-gcm-v1'),
  verification_source TEXT NOT NULL CHECK (verification_source='auth_provider'),
  verified_at TEXT NOT NULL,
  revoked_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX idx_sos_one_live_user_channel
  ON sos_user_channels(account_ref)
  WHERE revoked_at IS NULL;

UPDATE sos_schema_state
   SET schema_value='SOS.OP.2',recorded_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE schema_key='sos_operational_schema_version';

-- Mangrove Mews demo persistence. This schema is designed for deliberately
-- fictional fixtures only; production requires access controls and retention rules.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS intake_import_batches (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('whatsapp_export', 'sms_relay', 'phone_report')),
  provenance TEXT NOT NULL,
  fixture_only INTEGER NOT NULL DEFAULT 1 CHECK (fixture_only IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('queued', 'processed', 'failed')),
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_source_messages (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES intake_import_batches(id) ON DELETE CASCADE,
  source_message_id TEXT NOT NULL,
  trace_id TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL,
  volunteer_alias TEXT NOT NULL,
  body_redacted TEXT NOT NULL,
  broad_area TEXT,
  attachment_manifest_json TEXT NOT NULL DEFAULT '[]',
  received_at TEXT NOT NULL,
  raw_fixture_json TEXT NOT NULL,
  UNIQUE(batch_id, source_message_id)
);

CREATE TABLE IF NOT EXISTS intake_observations (
  id TEXT PRIMARY KEY,
  source_message_id TEXT NOT NULL REFERENCES intake_source_messages(id) ON DELETE CASCADE,
  proposed_cat_key TEXT,
  proposed_colony_key TEXT,
  colony_confidence REAL NOT NULL CHECK (colony_confidence >= 0 AND colony_confidence <= 1),
  duplicate_group TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'watch', 'routine')),
  uncertainty_note TEXT,
  requires_human_confirmation INTEGER NOT NULL DEFAULT 1 CHECK (requires_human_confirmation IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS colony_census_events (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES intake_observations(id) ON DELETE CASCADE,
  colony_key TEXT NOT NULL,
  reported_count_low INTEGER,
  reported_count_high INTEGER,
  count_confidence REAL NOT NULL CHECK (count_confidence >= 0 AND count_confidence <= 1),
  fixed_delta INTEGER NOT NULL DEFAULT 0,
  tnr_pending_delta INTEGER NOT NULL DEFAULT 0,
  medical_case_delta INTEGER NOT NULL DEFAULT 0,
  event_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feeder_visit_log (
  id TEXT PRIMARY KEY,
  source_message_id TEXT NOT NULL REFERENCES intake_source_messages(id) ON DELETE CASCADE,
  colony_key TEXT NOT NULL,
  feeder_alias TEXT NOT NULL,
  feeding_confirmed INTEGER NOT NULL CHECK (feeding_confirmed IN (0, 1)),
  headcount INTEGER,
  visited_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_review_queue (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES intake_observations(id) ON DELETE CASCADE,
  review_kind TEXT NOT NULL CHECK (review_kind IN ('urgent_care', 'possible_duplicate', 'uncertain_count', 'missing_search', 'new_cat')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'kept_separate', 'dismissed')),
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_intake_messages_batch ON intake_source_messages(batch_id, received_at);
CREATE INDEX IF NOT EXISTS idx_observations_colony ON intake_observations(proposed_colony_key, urgency);
CREATE INDEX IF NOT EXISTS idx_review_queue_open ON intake_review_queue(status, review_kind);

CREATE TABLE IF NOT EXISTS intake_review_decisions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES intake_review_queue(id),
  decision TEXT NOT NULL CHECK (decision IN ('confirmed', 'kept_separate', 'dismissed')),
  actor_id INTEGER NOT NULL,
  decided_at TEXT NOT NULL
);

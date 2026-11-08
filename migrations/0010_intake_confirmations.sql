-- Confidence-gated colony routing and human confirmation. Source reports stay immutable;
-- verified counts live beside the observation so materialization can choose them explicitly.
PRAGMA foreign_keys = ON;

ALTER TABLE intake_observations ADD COLUMN assigned_colony_key TEXT;
ALTER TABLE intake_observations ADD COLUMN assignment_state TEXT NOT NULL DEFAULT 'unmatched' CHECK (assignment_state IN ('auto', 'unmatched', 'confirmed'));
ALTER TABLE intake_observations ADD COLUMN source_count_low INTEGER CHECK (source_count_low IS NULL OR (source_count_low >= 0 AND source_count_low <= 200));
ALTER TABLE intake_observations ADD COLUMN source_count_high INTEGER CHECK (source_count_high IS NULL OR (source_count_high >= 0 AND source_count_high <= 200));
ALTER TABLE intake_observations ADD COLUMN source_count_confidence REAL CHECK (source_count_confidence IS NULL OR (source_count_confidence >= 0 AND source_count_confidence <= 1));
ALTER TABLE intake_observations ADD COLUMN source_feeding_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (source_feeding_confirmed IN (0,1));
ALTER TABLE intake_observations ADD COLUMN verified_count_low INTEGER CHECK (verified_count_low IS NULL OR (verified_count_low >= 0 AND verified_count_low <= 200));
ALTER TABLE intake_observations ADD COLUMN verified_count_high INTEGER CHECK (verified_count_high IS NULL OR (verified_count_high >= 0 AND verified_count_high <= 200));
ALTER TABLE intake_observations ADD COLUMN verified_count_confidence REAL CHECK (verified_count_confidence IS NULL OR (verified_count_confidence >= 0 AND verified_count_confidence <= 1));
ALTER TABLE intake_observations ADD COLUMN verification_evidence TEXT;
ALTER TABLE intake_observations ADD COLUMN verified_by INTEGER REFERENCES users(id);
ALTER TABLE intake_observations ADD COLUMN verified_at TEXT;

-- Existing import events are source evidence; copy their reported values once so
-- low-confidence/unmatched reports retain their original count without mutation.
UPDATE intake_observations
SET source_count_low = (SELECT reported_count_low FROM colony_census_events e WHERE e.observation_id = intake_observations.id ORDER BY e.event_at DESC LIMIT 1),
    source_count_high = (SELECT reported_count_high FROM colony_census_events e WHERE e.observation_id = intake_observations.id ORDER BY e.event_at DESC LIMIT 1),
    source_count_confidence = (SELECT count_confidence FROM colony_census_events e WHERE e.observation_id = intake_observations.id ORDER BY e.event_at DESC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM colony_census_events e WHERE e.observation_id = intake_observations.id);

UPDATE intake_observations
SET source_feeding_confirmed = 1
WHERE EXISTS (SELECT 1 FROM feeder_visit_log f WHERE f.source_message_id = intake_observations.source_message_id AND f.feeding_confirmed = 1);

UPDATE intake_observations
SET assigned_colony_key = proposed_colony_key,
    assignment_state = 'auto'
WHERE proposed_colony_key IS NOT NULL AND colony_confidence >= 0.75;

CREATE INDEX IF NOT EXISTS idx_observations_assignment_review
  ON intake_observations(assignment_state, colony_confidence DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS rescue_settings (
  setting_key TEXT PRIMARY KEY CHECK (setting_key = 'colony_match_threshold'),
  value_real REAL NOT NULL CHECK (value_real >= 0.50 AND value_real <= 0.95),
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO rescue_settings (setting_key, value_real, updated_at)
VALUES ('colony_match_threshold', 0.75, '2026-11-08T00:00:00.000Z');

CREATE TABLE IF NOT EXISTS intake_clarifications (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES intake_observations(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  assigned_user_id INTEGER REFERENCES users(id),
  request_message TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'replied', 'resolved')),
  reply_message TEXT,
  reply_evidence TEXT,
  replied_by INTEGER REFERENCES users(id),
  requested_at TEXT NOT NULL,
  replied_at TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_intake_clarifications_assignment
  ON intake_clarifications(assigned_user_id, state, requested_at DESC);

CREATE TABLE IF NOT EXISTS intake_confirmation_events (
  id TEXT PRIMARY KEY,
  observation_id TEXT REFERENCES intake_observations(id) ON DELETE CASCADE,
  clarification_id TEXT REFERENCES intake_clarifications(id) ON DELETE SET NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('clarification_requested', 'clarification_replied', 'observation_confirmed', 'routing_threshold_updated')),
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_confirmation_events_observation
  ON intake_confirmation_events(observation_id, created_at DESC);

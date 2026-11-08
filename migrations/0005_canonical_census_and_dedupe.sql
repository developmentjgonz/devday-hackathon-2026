-- Canonical materialization and explicitly human-approved duplicate decisions.
-- These tables retain fixture traceability; they do not permit automatic merges.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS canonical_colonies (
  colony_key TEXT PRIMARY KEY,
  broad_area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitor', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canonical_cats (
  cat_key TEXT PRIMARY KEY,
  canonical_cat_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'missing', 'deceased')),
  merged_into_cat_key TEXT REFERENCES canonical_cats(cat_key),
  created_from_observation_id TEXT REFERENCES intake_observations(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((status = 'merged' AND merged_into_cat_key IS NOT NULL) OR (status != 'merged' AND merged_into_cat_key IS NULL))
);

CREATE TABLE IF NOT EXISTS canonical_census_snapshots (
  id TEXT PRIMARY KEY,
  colony_key TEXT NOT NULL REFERENCES canonical_colonies(colony_key),
  known_cat_records INTEGER NOT NULL DEFAULT 0,
  urgent_open INTEGER NOT NULL DEFAULT 0,
  tnr_pending INTEGER NOT NULL DEFAULT 0,
  last_feeder_alias TEXT,
  last_fed_at TEXT,
  source_event_count INTEGER NOT NULL DEFAULT 0,
  materialized_at TEXT NOT NULL,
  UNIQUE(colony_key, materialized_at)
);

CREATE TABLE IF NOT EXISTS dedupe_merge_audit (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE REFERENCES intake_review_queue(id),
  source_cat_key TEXT NOT NULL REFERENCES canonical_cats(cat_key),
  target_cat_key TEXT NOT NULL REFERENCES canonical_cats(cat_key),
  decision TEXT NOT NULL CHECK (decision IN ('confirmed', 'kept_separate')),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reasoning TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  CHECK (source_cat_key != target_cat_key)
);

CREATE INDEX IF NOT EXISTS idx_canonical_cats_canonical ON canonical_cats(canonical_cat_key, status);
CREATE INDEX IF NOT EXISTS idx_census_snapshots_colony ON canonical_census_snapshots(colony_key, materialized_at DESC);

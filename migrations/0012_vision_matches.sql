-- Pixel evidence is advisory; reviewing it never merges or changes cat status.
CREATE TABLE IF NOT EXISTS vision_comparisons (
  id TEXT PRIMARY KEY,
  pair_key TEXT NOT NULL UNIQUE,
  left_ref TEXT NOT NULL,
  right_ref TEXT NOT NULL,
  left_sha256 TEXT NOT NULL,
  right_sha256 TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode='agent'),
  result_json TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','possible_same','kept_separate','inconclusive')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  review_reason TEXT
);

CREATE TABLE IF NOT EXISTS vision_match_attempts (
  id TEXT PRIMARY KEY,
  pair_key TEXT NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  started_at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','completed','failed'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vision_active_pair
  ON vision_match_attempts(pair_key) WHERE state='running';
CREATE INDEX IF NOT EXISTS idx_vision_actor_time ON vision_match_attempts(actor_id,started_at);

CREATE TABLE IF NOT EXISTS vision_match_audit (
  id TEXT PRIMARY KEY,
  comparison_id TEXT NOT NULL REFERENCES vision_comparisons(id),
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('compared','possible_same','kept_separate','inconclusive')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);

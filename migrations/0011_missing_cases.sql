PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS missing_cases (
  id TEXT PRIMARY KEY,
  canonical_cat_key TEXT REFERENCES canonical_cats(cat_key),
  reported_name TEXT NOT NULL,
  description TEXT NOT NULL,
  last_seen_area TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  photo_ref TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending_review','active','reunited','closed_unconfirmed')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  confirmed_by INTEGER REFERENCES users(id),
  confirmed_at TEXT,
  closed_by INTEGER REFERENCES users(id),
  closed_at TEXT,
  decision_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_missing_cases_status ON missing_cases(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_one_active_cat ON missing_cases(canonical_cat_key) WHERE status='active' AND canonical_cat_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS missing_case_feedback (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES missing_cases(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('seen','not_seen','unsafe')),
  broad_area TEXT NOT NULL,
  evidence_note TEXT NOT NULL,
  zone_id TEXT CHECK (zone_id IN ('zone-last','zone-cover','zone-home')),
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS missing_case_search_plans (
  case_id TEXT PRIMARY KEY REFERENCES missing_cases(id) ON DELETE CASCADE,
  plan_json TEXT NOT NULL,
  saved_by INTEGER NOT NULL REFERENCES users(id),
  saved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS missing_case_audit (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES missing_cases(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  event TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_missing_feedback_case ON missing_case_feedback(case_id, created_at DESC);

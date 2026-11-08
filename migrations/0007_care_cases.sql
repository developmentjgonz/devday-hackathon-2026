-- Human-confirmed care outcomes only. Unknown stays unknown until documented.
CREATE TABLE IF NOT EXISTS care_cases (
  id TEXT PRIMARY KEY,
  canonical_cat_key TEXT NOT NULL REFERENCES canonical_cats(cat_key),
  source_observation_id TEXT REFERENCES intake_observations(id),
  case_kind TEXT NOT NULL CHECK (case_kind IN ('medical', 'tnr')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'monitor')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  outcome TEXT CHECK (outcome IN ('medical_resolved', 'tnr_completed', 'tnr_not_completed', 'monitoring')),
  evidence_note TEXT,
  opened_by INTEGER NOT NULL REFERENCES users(id),
  opened_at TEXT NOT NULL,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TEXT,
  CHECK ((status = 'open' AND outcome IS NULL AND resolved_by IS NULL AND resolved_at IS NULL) OR (status = 'resolved' AND outcome IS NOT NULL AND evidence_note IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)),
  CHECK ((case_kind = 'medical' AND (outcome IS NULL OR outcome IN ('medical_resolved', 'monitoring'))) OR (case_kind = 'tnr' AND (outcome IS NULL OR outcome IN ('tnr_completed', 'tnr_not_completed', 'monitoring'))))
);

CREATE TABLE IF NOT EXISTS care_case_events (
  id TEXT PRIMARY KEY,
  care_case_id TEXT NOT NULL REFERENCES care_cases(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'resolved')),
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_cases_status_kind ON care_cases(status, case_kind, opened_at);
CREATE INDEX IF NOT EXISTS idx_care_cases_cat ON care_cases(canonical_cat_key, status);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS search_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  broad_area TEXT NOT NULL,
  canonical_cat_key TEXT REFERENCES canonical_cats(cat_key),
  fictional_latitude REAL,
  fictional_longitude REAL,
  assigned_user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('assigned', 'completed', 'blocked', 'cancelled')),
  safe_public_access INTEGER NOT NULL CHECK (safe_public_access IN (0,1)),
  no_floodwater_or_drains INTEGER NOT NULL CHECK (no_floodwater_or_drains IN (0,1)),
  no_traffic_entry INTEGER NOT NULL CHECK (no_traffic_entry IN (0,1)),
  risk_verified_human INTEGER NOT NULL CHECK (risk_verified_human IN (0,1)),
  risk_verified_at TEXT,
  forecast_source TEXT,
  forecast_severity TEXT NOT NULL DEFAULT 'unknown',
  forecast_checked_at TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  completed_at TEXT,
  blocked_at TEXT,
  evidence_timestamp TEXT,
  evidence_note TEXT,
  block_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_tasks_assignee_status_due ON search_tasks(assigned_user_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_search_tasks_status_due ON search_tasks(status, due_at);

CREATE TABLE IF NOT EXISTS search_task_audit (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES search_tasks(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  event TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_task_audit_task ON search_task_audit(task_id, created_at);

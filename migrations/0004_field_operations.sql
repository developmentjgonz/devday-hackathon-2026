CREATE TABLE IF NOT EXISTS feeding_assignments (
  id TEXT PRIMARY KEY,
  colony_key TEXT NOT NULL,
  assigned_user_id INTEGER NOT NULL REFERENCES users(id),
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_feeding_due ON feeding_assignments(status, due_at);

CREATE TABLE IF NOT EXISTS field_assignment_events (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES feeding_assignments(id),
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

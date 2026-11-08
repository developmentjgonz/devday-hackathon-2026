ALTER TABLE configuration ADD COLUMN autopilot_json TEXT NOT NULL DEFAULT '{"enabled":false,"resolveReports":true,"assignTasks":true,"updateRecords":true,"mergeColonies":true,"requireHumanReview":true}';
ALTER TABLE configuration ADD COLUMN autopilot_enabled_by TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE automation_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1), token TEXT, expires_at INTEGER NOT NULL DEFAULT 0
);
INSERT INTO automation_lock (id) VALUES (1);
CREATE TABLE automation_runs (
  id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')), summary TEXT NOT NULL DEFAULT ''
);
CREATE TABLE automation_events (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES automation_runs(id),
  operation_key TEXT UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('report', 'task', 'cat', 'colony', 'merge', 'review', 'error')),
  title TEXT NOT NULL, detail TEXT NOT NULL, target_path TEXT,
  before_json TEXT NOT NULL DEFAULT 'null', after_json TEXT NOT NULL DEFAULT 'null', occurred_at TEXT NOT NULL
);
CREATE INDEX automation_events_recent ON automation_events(occurred_at DESC);
CREATE TABLE automation_proposals (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES automation_runs(id),
  subject_key TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
  changes_json TEXT NOT NULL, payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'failed')),
  created_at TEXT NOT NULL, reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT
);
CREATE UNIQUE INDEX automation_pending_subject ON automation_proposals(subject_key) WHERE status = 'pending';
CREATE TABLE automation_report_attempts (
  report_id TEXT PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL, retry_after INTEGER NOT NULL
);

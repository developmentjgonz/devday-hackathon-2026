CREATE TABLE record_activity (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('cat', 'colony')),
  record_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('profile', 'task', 'report')),
  summary TEXT NOT NULL,
  changes_json TEXT NOT NULL DEFAULT '[]',
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  report_id TEXT,
  UNIQUE (operation_id, record_type, record_id)
);

CREATE INDEX record_activity_record ON record_activity(record_type, record_id, occurred_at DESC);

-- Creation times and creators already exist. Earlier edits cannot be reconstructed.
INSERT INTO record_activity (id, operation_id, record_type, record_id, kind, summary, actor_id, actor_name, occurred_at)
SELECT 'initial-colony-' || c.id, 'initial-colony-' || c.id, 'colony', c.id, 'profile', 'Colony created', c.created_by,
  COALESCE(u.name, 'Unknown'), strftime('%Y-%m-%dT%H:%M:%fZ', c.created_at, 'unixepoch')
FROM colonies c LEFT JOIN users u ON u.id = c.created_by;

INSERT INTO record_activity (id, operation_id, record_type, record_id, kind, summary, actor_id, actor_name, occurred_at)
SELECT 'initial-cat-' || c.id, 'initial-cat-' || c.id, 'cat', c.id, 'profile', 'Cat created', c.created_by,
  COALESCE(u.name, 'Unknown'), strftime('%Y-%m-%dT%H:%M:%fZ', c.created_at, 'unixepoch')
FROM cats c LEFT JOIN users u ON u.id = c.created_by;

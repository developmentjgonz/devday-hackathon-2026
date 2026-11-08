CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 4000),
  category TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TEXT NOT NULL,
  colony_id TEXT REFERENCES colonies(id) ON DELETE SET NULL,
  cat_id TEXT REFERENCES cats(id) ON DELETE SET NULL,
  care_note TEXT NOT NULL DEFAULT '',
  urgent INTEGER NOT NULL DEFAULT 0 CHECK (urgent IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'processed')),
  possible_duplicate_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  duplicate_of TEXT REFERENCES reports(id) ON DELETE SET NULL
);

CREATE TABLE report_reads (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, user_id)
);

CREATE TABLE report_entries (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL
);

CREATE TABLE report_history (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE report_attachments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size BETWEEN 0 AND 10485760)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  due TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE task_associations (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cat', 'colony', 'person', 'paperwork', 'other')),
  record_id TEXT,
  label TEXT,
  PRIMARY KEY (task_id, position),
  CHECK ((type IN ('cat', 'colony') AND record_id IS NOT NULL AND label IS NULL)
    OR (type IN ('person', 'paperwork', 'other') AND record_id IS NULL AND length(trim(label)) BETWEEN 1 AND 120))
);

CREATE INDEX reports_colony_id ON reports(colony_id);
CREATE INDEX reports_cat_id ON reports(cat_id);
CREATE INDEX reports_status ON reports(status);
CREATE INDEX report_entries_report_id ON report_entries(report_id, created_at);
CREATE INDEX report_history_report_id ON report_history(report_id, created_at);
CREATE INDEX report_attachments_report_id ON report_attachments(report_id);
CREATE INDEX tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX tasks_report_id ON tasks(report_id);

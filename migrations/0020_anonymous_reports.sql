-- Preserve report relationships while allowing reports with no account.
-- D1 keeps foreign-key enforcement enabled, so save dependent rows before
-- replacing the parent table and restore them within the migration batch.
PRAGMA defer_foreign_keys = ON;

-- Some active deployments track reads separately. Preserve that state when
-- rebuilding reports, including when this migration runs on the newer schema.
CREATE TABLE IF NOT EXISTS report_reads (
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, user_id)
);

CREATE TABLE _0020_reports AS SELECT * FROM reports;
CREATE TABLE _0020_report_reads AS SELECT rowid AS original_rowid, * FROM report_reads;
CREATE TABLE _0020_report_entries AS SELECT rowid AS original_rowid, * FROM report_entries;
CREATE TABLE _0020_report_history AS SELECT rowid AS original_rowid, * FROM report_history;
CREATE TABLE _0020_report_attachments AS SELECT rowid AS original_rowid, * FROM report_attachments;
CREATE TABLE _0020_task_reports AS SELECT id, report_id FROM tasks WHERE report_id IS NOT NULL;

CREATE TABLE reports_0020 (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 4000),
  category TEXT NOT NULL,
  reporter_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TEXT NOT NULL,
  colony_id TEXT REFERENCES colonies(id) ON DELETE SET NULL,
  cat_id TEXT REFERENCES cats(id) ON DELETE SET NULL,
  care_note TEXT NOT NULL DEFAULT '',
  urgent INTEGER NOT NULL DEFAULT 0 CHECK (urgent IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'processed')),
  possible_duplicate_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  duplicate_of TEXT REFERENCES reports(id) ON DELETE SET NULL
);

DROP TABLE reports;
ALTER TABLE reports_0020 RENAME TO reports;
INSERT INTO reports SELECT * FROM _0020_reports;
INSERT INTO report_reads (rowid, report_id, user_id)
  SELECT original_rowid, report_id, user_id FROM _0020_report_reads;
INSERT INTO report_entries (rowid, id, report_id, author_id, text, created_at)
  SELECT original_rowid, id, report_id, author_id, text, created_at FROM _0020_report_entries;
INSERT INTO report_history (rowid, id, report_id, actor_id, text, created_at)
  SELECT original_rowid, id, report_id, actor_id, text, created_at FROM _0020_report_history;
INSERT INTO report_attachments (rowid, id, report_id, storage_key, name, mime_type, size)
  SELECT original_rowid, id, report_id, storage_key, name, mime_type, size FROM _0020_report_attachments;
UPDATE tasks SET report_id = (SELECT report_id FROM _0020_task_reports WHERE _0020_task_reports.id = tasks.id)
  WHERE id IN (SELECT id FROM _0020_task_reports);

CREATE INDEX reports_colony_id ON reports(colony_id);
CREATE INDEX reports_cat_id ON reports(cat_id);
CREATE INDEX reports_status ON reports(status);
DROP TABLE _0020_reports;
DROP TABLE _0020_report_reads;
DROP TABLE _0020_report_entries;
DROP TABLE _0020_report_history;
DROP TABLE _0020_report_attachments;
DROP TABLE _0020_task_reports;

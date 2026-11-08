-- Add a dismissed state and preserve report data, related rows, and search.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE _0033_reports AS SELECT * FROM reports;
CREATE TABLE _0033_report_reads AS SELECT rowid AS original_rowid, * FROM report_reads;
CREATE TABLE _0033_report_entries AS SELECT rowid AS original_rowid, * FROM report_entries;
CREATE TABLE _0033_report_history AS SELECT rowid AS original_rowid, * FROM report_history;
CREATE TABLE _0033_report_attachments AS SELECT rowid AS original_rowid, * FROM report_attachments;
CREATE TABLE _0033_task_reports AS SELECT id, report_id FROM tasks WHERE report_id IS NOT NULL;

CREATE TABLE reports_0033 (
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'processed', 'dismissed')),
  possible_duplicate_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  duplicate_of TEXT REFERENCES reports(id) ON DELETE SET NULL,
  public_latitude REAL,
  public_longitude REAL,
  public_google_place_id TEXT,
  public_submission_hash TEXT,
  public_contact_phone TEXT,
  public_contact_email TEXT,
  public_contact_consented_at TEXT
);

DROP TRIGGER report_search_insert;
DROP TRIGGER report_search_delete;
DROP TRIGGER report_search_update;
DROP TABLE report_search;
DROP TABLE reports;
ALTER TABLE reports_0033 RENAME TO reports;
INSERT INTO reports SELECT * FROM _0033_reports;
INSERT INTO report_reads (rowid, report_id, user_id)
  SELECT original_rowid, report_id, user_id FROM _0033_report_reads;
INSERT INTO report_entries (rowid, id, report_id, author_id, text, created_at)
  SELECT original_rowid, id, report_id, author_id, text, created_at FROM _0033_report_entries;
INSERT INTO report_history (rowid, id, report_id, actor_id, text, created_at)
  SELECT original_rowid, id, report_id, actor_id, text, created_at FROM _0033_report_history;
INSERT INTO report_attachments (rowid, id, report_id, storage_key, name, mime_type, size)
  SELECT original_rowid, id, report_id, storage_key, name, mime_type, size FROM _0033_report_attachments;
UPDATE tasks SET report_id = (SELECT report_id FROM _0033_task_reports WHERE _0033_task_reports.id = tasks.id)
  WHERE id IN (SELECT id FROM _0033_task_reports);

CREATE INDEX reports_colony_id ON reports(colony_id);
CREATE INDEX reports_cat_id ON reports(cat_id);
CREATE INDEX reports_status ON reports(status);
DROP TABLE _0033_reports;
DROP TABLE _0033_report_reads;
DROP TABLE _0033_report_entries;
DROP TABLE _0033_report_history;
DROP TABLE _0033_report_attachments;
DROP TABLE _0033_task_reports;

CREATE VIRTUAL TABLE report_search USING fts5(title, message, content='reports', content_rowid='rowid');

INSERT INTO report_search(report_search) VALUES ('rebuild');

CREATE TRIGGER report_search_insert AFTER INSERT ON reports BEGIN
  INSERT INTO report_search(rowid, title, message) VALUES (new.rowid, new.title, new.message);
END;
CREATE TRIGGER report_search_delete AFTER DELETE ON reports BEGIN
  INSERT INTO report_search(report_search, rowid, title, message) VALUES ('delete', old.rowid, old.title, old.message);
END;
CREATE TRIGGER report_search_update AFTER UPDATE OF title, message ON reports BEGIN
  INSERT INTO report_search(report_search, rowid, title, message) VALUES ('delete', old.rowid, old.title, old.message);
  INSERT INTO report_search(rowid, title, message) VALUES (new.rowid, new.title, new.message);
END;

CREATE INDEX reports_duplicate_of ON reports(duplicate_of);
CREATE INDEX reports_colony_recent ON reports(colony_id, duplicate_of, submitted_at DESC, id);

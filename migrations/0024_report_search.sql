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

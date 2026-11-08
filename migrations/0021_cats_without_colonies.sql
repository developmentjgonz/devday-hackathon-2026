-- D1 keeps foreign-key actions enabled while tables are rebuilt. Preserve
-- photos and report links before replacing the cats table.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE _0021_cat_photos AS SELECT rowid AS original_rowid, * FROM cat_photos;
CREATE TABLE _0021_report_cats AS SELECT id, cat_id FROM reports WHERE cat_id IS NOT NULL;

CREATE TABLE cats_0021 (
  id TEXT PRIMARY KEY,
  colony_id TEXT REFERENCES colonies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  photo_url TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  birth_date TEXT,
  birth_date_estimated INTEGER NOT NULL DEFAULT 0 CHECK (birth_date_estimated IN (0, 1)),
  description TEXT NOT NULL DEFAULT ''
);

INSERT INTO cats_0021 (rowid, id, colony_id, name, photo_url, created_by, created_at, birth_date, birth_date_estimated, description)
  SELECT rowid, id, colony_id, name, photo_url, created_by, created_at, birth_date, birth_date_estimated, description FROM cats;
DROP TABLE cats;
ALTER TABLE cats_0021 RENAME TO cats;
INSERT INTO cat_photos (rowid, cat_id, mime_type, data, revision)
  SELECT original_rowid, cat_id, mime_type, data, revision FROM _0021_cat_photos;
UPDATE reports SET cat_id = (SELECT cat_id FROM _0021_report_cats WHERE _0021_report_cats.id = reports.id)
  WHERE id IN (SELECT id FROM _0021_report_cats);

CREATE INDEX cats_colony_id ON cats(colony_id);
DROP TABLE _0021_cat_photos;
DROP TABLE _0021_report_cats;

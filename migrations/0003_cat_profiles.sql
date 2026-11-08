ALTER TABLE cats ADD COLUMN birth_date TEXT;
ALTER TABLE cats ADD COLUMN birth_date_estimated INTEGER NOT NULL DEFAULT 0 CHECK (birth_date_estimated IN (0, 1));
ALTER TABLE cats ADD COLUMN description TEXT NOT NULL DEFAULT '';

CREATE TABLE cat_photos (
  cat_id TEXT PRIMARY KEY REFERENCES cats(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  data TEXT NOT NULL,
  revision TEXT NOT NULL
);

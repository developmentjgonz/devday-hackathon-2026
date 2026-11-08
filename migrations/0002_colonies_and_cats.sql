CREATE TABLE colonies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  photo_url TEXT,
  longitude REAL CHECK (longitude BETWEEN -180 AND 180),
  latitude REAL CHECK (latitude BETWEEN -90 AND 90),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK ((longitude IS NULL AND latitude IS NULL) OR (longitude IS NOT NULL AND latitude IS NOT NULL))
);

CREATE TABLE cats (
  id TEXT PRIMARY KEY,
  colony_id TEXT NOT NULL REFERENCES colonies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  photo_url TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX cats_colony_id ON cats(colony_id);

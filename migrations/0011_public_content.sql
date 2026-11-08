-- Only explicitly published summaries are public. Private colony coordinates stay in the directory.
CREATE TABLE public_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  boundary TEXT NOT NULL,
  activity TEXT NOT NULL CHECK (activity IN ('low', 'medium', 'high')),
  colony_count_band TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE community_posts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('opening', 'news')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  schedule TEXT NOT NULL DEFAULT '',
  published_date TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0
);

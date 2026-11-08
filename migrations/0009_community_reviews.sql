-- Stores only a controlled, broad-area interpretation of fictional community leads.
-- No raw post, handle, contact, URL, photo, pin, or original author is retained.
CREATE TABLE IF NOT EXISTS community_reviews (
  id TEXT PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  classification TEXT NOT NULL CHECK (classification IN ('missing-cat', 'colony-lead', 'not-actionable')),
  broad_area TEXT,
  assessment_mode TEXT NOT NULL CHECK (assessment_mode IN ('agent', 'fallback', 'demo')),
  title TEXT NOT NULL,
  safe_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'verified', 'dismissed')),
  fictional_only INTEGER NOT NULL CHECK (fictional_only = 1),
  created_at TEXT NOT NULL,
  decided_by INTEGER REFERENCES users(id),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS community_review_events (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES community_reviews(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'verified', 'dismissed')),
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_reviews_owner ON community_reviews(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reviews_status ON community_reviews(status, created_at DESC);

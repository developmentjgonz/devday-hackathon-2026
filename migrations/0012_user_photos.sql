CREATE TABLE user_photos (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  data TEXT NOT NULL,
  revision TEXT NOT NULL
);

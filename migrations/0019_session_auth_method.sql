ALTER TABLE sessions ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'standard'
  CHECK (auth_method IN ('standard', 'demo', 'demo-admin'));

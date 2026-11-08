ALTER TABLE intake_import_batches ADD COLUMN source_digest TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_source_digest ON intake_import_batches(source_digest) WHERE source_digest IS NOT NULL;
CREATE TABLE IF NOT EXISTS intake_assessments (
  observation_id TEXT PRIMARY KEY REFERENCES intake_observations(id),
  mode TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

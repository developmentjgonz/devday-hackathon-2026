-- Cross-mode source identity is independent of an import/replay batch wrapper.
-- Existing evidence and human decisions are deliberately not rewritten/deleted.
CREATE TABLE IF NOT EXISTS intake_source_identities (
  source_key TEXT PRIMARY KEY,
  fixture_family TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('whatsapp_export','sms_relay','phone_report')),
  source_record_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','stored')),
  claim_token TEXT,
  claim_until TEXT,
  source_message_id TEXT REFERENCES intake_source_messages(id),
  created_at TEXT NOT NULL,
  stored_at TEXT,
  UNIQUE(fixture_family, source_kind, source_record_id),
  CHECK ((state='pending' AND claim_token IS NOT NULL AND claim_until IS NOT NULL AND source_message_id IS NULL)
    OR (state='stored' AND source_message_id IS NOT NULL AND stored_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_source_identity_message ON intake_source_identities(source_message_id);

-- Read-only inventory of historical bulk/stream collisions. Keep every original
-- source, review, and decision until a person chooses a separate remediation.
CREATE VIEW IF NOT EXISTS legacy_fixture_source_duplicates AS
WITH families(family, alias) AS (
  VALUES
    ('fixture-south-florida-2026-11-07-a','fixture-south-florida-2026-11-07-a'),
    ('fixture-south-florida-2026-11-07-a','live-shift-v1'),
    ('fixture-followup-morning-2026-11-08-a','fixture-followup-morning-2026-11-08-a'),
    ('fixture-weekend-dispatch-2026-11-08-v1','fixture-weekend-dispatch-2026-11-08-v1')
), matched AS (
  SELECT f.family, m.source_kind, m.source_message_id AS source_record_id,
    m.id AS message_id, m.batch_id, m.received_at
  FROM intake_source_messages m JOIN families f
    ON m.batch_id=f.alias OR m.batch_id=f.alias||'-'||m.source_message_id
)
SELECT family, source_kind, source_record_id, COUNT(*) AS stored_copies,
  MIN(received_at) AS first_source_time,
  json_group_array(message_id) AS message_ids_json,
  json_group_array(batch_id) AS batch_ids_json
FROM matched GROUP BY family, source_kind, source_record_id HAVING COUNT(*)>1;

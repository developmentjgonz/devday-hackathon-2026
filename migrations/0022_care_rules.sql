CREATE TABLE care_rules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cat_id TEXT REFERENCES cats(id) ON DELETE CASCADE,
  colony_id TEXT REFERENCES colonies(id) ON DELETE CASCADE,
  repeat_days INTEGER NOT NULL CHECK (repeat_days BETWEEN 1 AND 365),
  start_date TEXT NOT NULL,
  next_due TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  CHECK ((cat_id IS NOT NULL AND colony_id IS NULL) OR (cat_id IS NULL AND colony_id IS NOT NULL))
);

ALTER TABLE tasks ADD COLUMN care_rule_id TEXT REFERENCES care_rules(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN care_rule_due TEXT;
CREATE UNIQUE INDEX tasks_care_rule_occurrence ON tasks(care_rule_id, care_rule_due);
CREATE INDEX care_rules_next_due ON care_rules(active, next_due);

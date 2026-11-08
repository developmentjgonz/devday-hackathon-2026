-- Synthetic field coordination. Appointments never imply a medical/TNR outcome.
CREATE TABLE IF NOT EXISTS field_appointments (
  id TEXT PRIMARY KEY,
  cat_key TEXT NOT NULL REFERENCES canonical_cats(cat_key),
  kind TEXT NOT NULL CHECK(kind IN ('vet','tnr','follow_up')),
  title TEXT NOT NULL,
  clinic_label TEXT NOT NULL,
  broad_area TEXT NOT NULL,
  due_at TEXT NOT NULL,
  assigned_user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','arrived','completed','cancelled')),
  evidence_note TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_field_appointment_due ON field_appointments(assigned_user_id,status,due_at);

CREATE TABLE IF NOT EXISTS supply_requests (
  id TEXT PRIMARY KEY,
  colony_key TEXT NOT NULL REFERENCES canonical_colonies(colony_key),
  item_kind TEXT NOT NULL CHECK(item_kind IN ('dry_food','wet_food','trap','carrier','litter','other')),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 500),
  note TEXT NOT NULL,
  needed_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','fulfilled','cancelled')),
  resolution_note TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS supply_pledges (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES supply_requests(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 0 AND 500),
  updated_at TEXT NOT NULL,
  UNIQUE(request_id,user_id)
);

CREATE TABLE IF NOT EXISTS daily_handoffs (
  id TEXT PRIMARY KEY,
  cat_key TEXT REFERENCES canonical_cats(cat_key),
  colony_key TEXT REFERENCES canonical_colonies(colony_key),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('normal','urgent')),
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  resolution_note TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  closed_at TEXT,
  CHECK(cat_key IS NOT NULL OR colony_key IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS handoff_acknowledgements (
  id TEXT PRIMARY KEY,
  handoff_id TEXT NOT NULL REFERENCES daily_handoffs(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(handoff_id,user_id)
);

CREATE TABLE IF NOT EXISTS field_tool_events (
  id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL CHECK(entity_kind IN ('appointment','supply','handoff')),
  entity_id TEXT NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_field_tool_event_entity ON field_tool_events(entity_kind,entity_id,created_at);

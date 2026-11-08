-- Fictional local accounts only. This file is never a production migration.
-- Re-running the seed preserves profile and status changes.
INSERT OR IGNORE INTO users (id, name, email, role, status, approved_by, approved_at)
VALUES ('local-admin', 'Alex Morgan', 'admin@mews.test', 'administrator', 'active', 'local-admin', unixepoch());

INSERT OR IGNORE INTO users (id, name, email, role, status, approved_by, approved_at)
VALUES ('local-member', 'Sam Rivera', 'member@mews.test', 'member', 'active', 'local-admin', unixepoch());

INSERT OR IGNORE INTO users (id, name, email, role, status)
VALUES ('local-pending', 'Jordan Lee', 'pending@mews.test', 'member', 'pending');

INSERT OR IGNORE INTO users (id, name, email, role, status)
VALUES ('local-suspended', 'Taylor Reed', 'suspended@mews.test', 'member', 'suspended');

INSERT OR IGNORE INTO sign_in_identities (provider, subject, user_id)
SELECT 'local', id, id FROM users
WHERE id IN ('local-admin', 'local-member', 'local-pending', 'local-suspended');

-- Fictional local directory records match the local report examples.
INSERT OR IGNORE INTO colonies (id, name, longitude, latitude, created_by) VALUES
  ('riverside', 'Riverside', -80.249, 25.812, 'local-admin'),
  ('canal', 'Canal', -80.226, 25.797, 'local-admin'),
  ('grove', 'Grove', -80.243, 25.771, 'local-admin');

INSERT OR IGNORE INTO cats (id, colony_id, name, photo_url, created_by) VALUES
  ('pepper', 'riverside', 'Pepper', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80', 'local-admin'),
  ('miso', 'canal', 'Miso', NULL, 'local-admin'),
  ('olive', 'grove', 'Olive', NULL, 'local-admin');

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

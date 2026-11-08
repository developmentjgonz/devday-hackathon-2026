-- Mark only the fictional accounts as eligible for public demo sign-in.
-- Real accounts and administrators never receive a demo identity.
INSERT OR IGNORE INTO sign_in_identities (provider, subject, user_id)
SELECT 'demo', u.id, u.id FROM users u
WHERE u.role = 'member'
  AND ((u.id = 'local-admin' AND u.email = 'admin@mews.test')
    OR (u.id = 'local-member' AND u.email = 'member@mews.test')
    OR (u.id = 'local-pending' AND u.email = 'pending@mews.test')
    OR (u.id = 'local-suspended' AND u.email = 'suspended@mews.test'))
  AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'google');

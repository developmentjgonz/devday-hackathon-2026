-- Create only the fictional administrator used by protected demo sign-in.
INSERT OR IGNORE INTO users (id, name, email, role, status)
VALUES ('demo-administrator', 'Demo administrator', 'demo.admin@mews.test', 'administrator', 'active');

INSERT OR IGNORE INTO sign_in_identities (provider, subject, user_id)
SELECT 'demo-admin', u.id, u.id FROM users u
WHERE u.id = 'demo-administrator' AND u.email = 'demo.admin@mews.test'
  AND u.role = 'administrator' AND u.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider IN ('google', 'demo', 'local'));

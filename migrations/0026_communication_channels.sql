ALTER TABLE configuration ADD COLUMN phone_enabled INTEGER NOT NULL DEFAULT 0 CHECK (phone_enabled IN (0, 1));
ALTER TABLE configuration ADD COLUMN email_enabled INTEGER NOT NULL DEFAULT 0 CHECK (email_enabled IN (0, 1));

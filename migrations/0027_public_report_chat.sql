ALTER TABLE configuration ADD COLUMN report_chat_enabled INTEGER NOT NULL DEFAULT 0 CHECK (report_chat_enabled IN (0, 1));

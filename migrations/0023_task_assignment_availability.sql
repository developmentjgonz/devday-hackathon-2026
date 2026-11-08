ALTER TABLE users ADD COLUMN task_assignable INTEGER NOT NULL DEFAULT 1 CHECK (task_assignable IN (0, 1));

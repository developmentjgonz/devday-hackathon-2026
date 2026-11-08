CREATE TABLE demo_access (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
);

INSERT INTO demo_access (id) VALUES (1);

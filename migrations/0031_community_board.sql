CREATE TABLE community_sections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  layout TEXT NOT NULL DEFAULT 'cards' CHECK (layout IN ('cards', 'list')),
  position INTEGER NOT NULL DEFAULT 0
);

INSERT INTO community_sections (id, title, layout, position) VALUES
  ('volunteer-openings', 'Volunteer openings', 'cards', 0),
  ('community-news', 'Community news', 'list', 1);

CREATE TABLE community_posts_next (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES community_sections(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  schedule TEXT NOT NULL DEFAULT '',
  published_date TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0
);

INSERT INTO community_posts_next
  (id, section_id, title, description, area, schedule, published_date, published, position)
SELECT id, CASE kind WHEN 'opening' THEN 'volunteer-openings' ELSE 'community-news' END,
  title, description, area, schedule, published_date, published, position
FROM community_posts;

DROP TABLE community_posts;
ALTER TABLE community_posts_next RENAME TO community_posts;
CREATE INDEX community_posts_section ON community_posts(section_id, position, id);

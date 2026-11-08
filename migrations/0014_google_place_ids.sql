ALTER TABLE colonies ADD COLUMN google_place_id TEXT CHECK (
  google_place_id IS NULL OR (
    length(google_place_id) BETWEEN 1 AND 512 AND
    longitude IS NULL AND latitude IS NULL AND address IS NULL
  )
);

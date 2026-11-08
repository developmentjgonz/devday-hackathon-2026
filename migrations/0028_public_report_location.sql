-- Store an optional public report pin or a Google Place ID.
-- Google-supplied coordinates and addresses are not stored.
ALTER TABLE reports ADD COLUMN public_latitude REAL;
ALTER TABLE reports ADD COLUMN public_longitude REAL;
ALTER TABLE reports ADD COLUMN public_google_place_id TEXT;

ALTER TABLE colonies ADD COLUMN address TEXT CHECK (address IS NULL OR length(address) <= 500);

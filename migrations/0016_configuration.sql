CREATE TABLE configuration (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  inbound_phone TEXT NOT NULL DEFAULT '',
  inbound_email TEXT NOT NULL DEFAULT '',
  openai_model TEXT NOT NULL DEFAULT '',
  openai_key_ciphertext TEXT,
  openai_key_nonce TEXT,
  CHECK ((openai_key_ciphertext IS NULL) = (openai_key_nonce IS NULL))
);

INSERT INTO configuration (id) VALUES (1);

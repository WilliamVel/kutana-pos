CREATE TABLE auth_refresh_tokens (
  token_hash text PRIMARY KEY,
  operator_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_refresh_tokens_expires_at_idx ON auth_refresh_tokens (expires_at);

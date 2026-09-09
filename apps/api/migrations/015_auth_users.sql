CREATE TABLE auth_users (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator')),
  pin_hash text NOT NULL,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_users_active_display_name_idx
  ON auth_users (lower(display_name))
  WHERE deactivated_at IS NULL;

CREATE INDEX auth_users_role_idx ON auth_users (role);

COMMENT ON TABLE auth_users IS
  'Persisted authentication users. Seed the first admin by setting AUTH_BOOTSTRAP_ADMIN_OPERATOR and AUTH_BOOTSTRAP_ADMIN_PIN_HASH before first admin login; no production credential is hardcoded.';

-- Treat table names/numbers as unique regardless of casing or surrounding spaces.
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_tables_label_ci_unique
  ON restaurant_tables (lower(btrim(label)));

ALTER TABLE restaurant_tables
  DROP CONSTRAINT restaurant_tables_status_check;

ALTER TABLE restaurant_tables
  ADD CONSTRAINT restaurant_tables_status_check
  CHECK (status IN ('free', 'active', 'needs_check', 'paid', 'retired'));

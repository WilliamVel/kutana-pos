-- Stock movement references are arbitrary domain identifiers, not UUIDs.
-- The USING cast preserves existing UUID values as their canonical text form.
ALTER TABLE stock_movements
  ALTER COLUMN ref_id TYPE text
  USING ref_id::text;

-- Catalog and inventory reference identifiers are arbitrary domain strings.
-- Keep the foreign keys while aligning their storage type with the shared ports.
ALTER TABLE products
  DROP CONSTRAINT products_category_id_fkey,
  DROP CONSTRAINT products_stock_item_id_fkey;
ALTER TABLE stock_movements
  DROP CONSTRAINT stock_movements_stock_item_id_fkey;

ALTER TABLE categories
  ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE stock_items
  ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE products
  ALTER COLUMN category_id TYPE text USING category_id::text,
  ALTER COLUMN stock_item_id TYPE text USING stock_item_id::text;

ALTER TABLE products
  ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id),
  ADD CONSTRAINT products_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES stock_items(id);
ALTER TABLE stock_movements
  ALTER COLUMN stock_item_id TYPE text USING stock_item_id::text,
  ADD CONSTRAINT stock_movements_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES stock_items(id);

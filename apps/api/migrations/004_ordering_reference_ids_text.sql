-- Ordering aggregate identifiers are arbitrary domain strings, not UUIDs.
-- Preserve existing UUID values as their canonical text representation while
-- retaining all aggregate foreign keys and indexes.
ALTER TABLE line_items DROP CONSTRAINT line_items_order_id_fkey;
ALTER TABLE allocations DROP CONSTRAINT allocations_line_item_id_fkey;
ALTER TABLE account_line_allocations DROP CONSTRAINT account_line_allocations_line_item_id_fkey;
ALTER TABLE tickets DROP CONSTRAINT tickets_order_id_fkey;
ALTER TABLE personal_accounts DROP CONSTRAINT personal_accounts_order_id_fkey;
ALTER TABLE sales DROP CONSTRAINT sales_order_id_fkey;
ALTER TABLE orders DROP CONSTRAINT orders_table_id_fkey;
ALTER TABLE restaurant_tables DROP CONSTRAINT tables_current_order_fk;

ALTER TABLE restaurant_tables ALTER COLUMN id DROP DEFAULT, ALTER COLUMN current_order_id DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN id DROP DEFAULT, ALTER COLUMN table_id DROP DEFAULT;
ALTER TABLE line_items ALTER COLUMN id DROP DEFAULT;

ALTER TABLE restaurant_tables
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN current_order_id TYPE text USING current_order_id::text;
ALTER TABLE orders
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN table_id TYPE text USING table_id::text;
ALTER TABLE line_items
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN order_id TYPE text USING order_id::text;
ALTER TABLE allocations ALTER COLUMN line_item_id TYPE text USING line_item_id::text;
ALTER TABLE account_line_allocations ALTER COLUMN line_item_id TYPE text USING line_item_id::text;
ALTER TABLE tickets ALTER COLUMN order_id TYPE text USING order_id::text;
ALTER TABLE personal_accounts ALTER COLUMN order_id TYPE text USING order_id::text;
ALTER TABLE sales ALTER COLUMN order_id TYPE text USING order_id::text;

ALTER TABLE restaurant_tables ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE line_items ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE orders ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES restaurant_tables(id);
ALTER TABLE restaurant_tables ADD CONSTRAINT tables_current_order_fk FOREIGN KEY (current_order_id) REFERENCES orders(id);
ALTER TABLE line_items ADD CONSTRAINT line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
ALTER TABLE allocations ADD CONSTRAINT allocations_line_item_id_fkey FOREIGN KEY (line_item_id) REFERENCES line_items(id);
ALTER TABLE account_line_allocations ADD CONSTRAINT account_line_allocations_line_item_id_fkey FOREIGN KEY (line_item_id) REFERENCES line_items(id);
ALTER TABLE tickets ADD CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
ALTER TABLE personal_accounts ADD CONSTRAINT personal_accounts_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
ALTER TABLE sales ADD CONSTRAINT sales_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);

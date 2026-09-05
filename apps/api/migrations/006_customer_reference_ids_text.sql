-- Customer identifiers are arbitrary domain strings, not UUIDs.
-- Preserve existing UUID values while keeping all customer foreign keys.
ALTER TABLE orders DROP CONSTRAINT orders_customer_id_fkey;
ALTER TABLE personal_accounts DROP CONSTRAINT personal_accounts_customer_id_fkey;
ALTER TABLE payments DROP CONSTRAINT payments_customer_id_fkey;
ALTER TABLE sales DROP CONSTRAINT sales_customer_id_fkey;
ALTER TABLE customer_debt_ledger DROP CONSTRAINT customer_debt_ledger_customer_id_fkey;

ALTER TABLE customers ALTER COLUMN id DROP DEFAULT;

ALTER TABLE customers ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE orders ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE personal_accounts ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE payments ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE sales ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE customer_debt_ledger ALTER COLUMN customer_id TYPE text USING customer_id::text;

ALTER TABLE customers ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE personal_accounts ADD CONSTRAINT personal_accounts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE payments ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_debt_ledger ADD CONSTRAINT customer_debt_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);

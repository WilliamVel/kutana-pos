-- Personal account identifiers are arbitrary domain strings, not UUIDs.
-- Preserve existing UUID values while keeping dependent allocation/payment FKs.
ALTER TABLE account_line_allocations DROP CONSTRAINT account_line_allocations_account_id_fkey;
ALTER TABLE payments DROP CONSTRAINT payments_account_id_fkey;
ALTER TABLE account_line_allocations DROP CONSTRAINT account_line_allocations_account_id_line_item_id_key;

ALTER TABLE personal_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE account_line_allocations ALTER COLUMN id DROP DEFAULT;

ALTER TABLE personal_accounts ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE account_line_allocations
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN account_id TYPE text USING account_id::text;
ALTER TABLE payments ALTER COLUMN account_id TYPE text USING account_id::text;

ALTER TABLE personal_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE account_line_allocations ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE account_line_allocations ADD CONSTRAINT account_line_allocations_account_id_fkey FOREIGN KEY (account_id) REFERENCES personal_accounts(id);
ALTER TABLE payments ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES personal_accounts(id);

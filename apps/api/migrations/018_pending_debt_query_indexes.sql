-- Supports the server-side pending-debt list without scanning customer names.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS customers_display_name_trgm_idx ON customers USING gin (lower(display_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customer_debt_customer_created_id_idx ON customer_debt_ledger (customer_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS customer_debt_account_idx ON customer_debt_ledger (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS personal_accounts_pending_free_idx ON personal_accounts (created_at, id) WHERE status = 'pending' AND customer_id IS NULL;
CREATE INDEX IF NOT EXISTS account_line_allocations_account_line_idx ON account_line_allocations (account_id, line_item_id);

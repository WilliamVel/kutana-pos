-- Customer debt ledger identifiers and references are arbitrary domain strings.
-- Keep legacy ref_id for compatibility, but write/read explicit account/payment/note columns going forward.
ALTER TABLE customer_debt_ledger ALTER COLUMN id DROP DEFAULT;

ALTER TABLE customer_debt_ledger
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN ref_id TYPE text USING ref_id::text;

ALTER TABLE customer_debt_ledger ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE customer_debt_ledger
  ADD COLUMN account_id text,
  ADD COLUMN payment_id text,
  ADD COLUMN note text;

ALTER TABLE customer_debt_ledger DISABLE TRIGGER debt_ledger_immutable;

UPDATE customer_debt_ledger
SET account_id = ref_id
WHERE kind = 'pending_account' AND account_id IS NULL;

UPDATE customer_debt_ledger
SET payment_id = ref_id
WHERE kind = 'payment' AND payment_id IS NULL;

ALTER TABLE customer_debt_ledger ENABLE TRIGGER debt_ledger_immutable;

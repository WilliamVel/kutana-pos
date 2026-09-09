-- Payment methods are runtime data owned by Postgres, not frontend constants.
CREATE TABLE IF NOT EXISTS payment_methods (
  code text PRIMARY KEY,
  label text NOT NULL,
  requires_tendered boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO payment_methods (code, label, requires_tendered, active, sort_order) VALUES
  ('CASH', 'Cash', true, true, 1),
  ('BANK_TRANSFER', 'Bank Transfer', false, true, 2),
  ('QR_PAYMENT', 'QR Payment', false, true, 3)
ON CONFLICT (code) DO NOTHING;

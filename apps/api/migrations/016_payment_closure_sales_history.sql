-- Immutable payment-closure sale history. Existing sales rows remain valid through defaults.
ALTER TABLE sales
  ADD COLUMN currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code = 'USD'),
  ADD COLUMN subtotal_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  ADD COLUMN discount_total_cents integer NOT NULL DEFAULT 0 CHECK (discount_total_cents >= 0),
  ADD COLUMN paid_cents integer NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  ADD COLUMN pending_cents integer NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
  ADD COLUMN status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  ADD COLUMN table_id text REFERENCES restaurant_tables(id),
  ADD COLUMN opened_at timestamptz,
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN closed_by_user_id text REFERENCES auth_users(id);

DROP TRIGGER sales_immutable ON sales;
UPDATE sales
SET subtotal_cents = total_cents - tax_total_cents,
    paid_cents = total_cents,
    pending_cents = 0,
    closed_at = completed_at
WHERE closed_at IS NULL;
ALTER TABLE sales ALTER COLUMN closed_at SET NOT NULL;
CREATE TRIGGER sales_immutable BEFORE UPDATE OR DELETE ON sales FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  order_line_item_id text,
  product_id text NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL CHECK (tax_cents >= 0),
  discount_cents integer NOT NULL CHECK (discount_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  account_id text,
  customer_id text REFERENCES customers(id)
);

CREATE TABLE sale_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  method_code text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  tendered_cents integer,
  change_cents integer,
  settled_at timestamptz NOT NULL,
  account_id text,
  customer_id text REFERENCES customers(id),
  CHECK (tendered_cents IS NULL OR tendered_cents >= amount_cents),
  CHECK (change_cents IS NULL OR change_cents = tendered_cents - amount_cents)
);

CREATE INDEX sales_order_idx ON sales(order_id);
CREATE INDEX sales_closed_at_idx ON sales(closed_at);
CREATE INDEX sale_items_sale_idx ON sale_items(sale_id, id);
CREATE INDEX sale_settlements_sale_idx ON sale_settlements(sale_id, settled_at, id);
CREATE INDEX sale_items_customer_idx ON sale_items(customer_id);
CREATE INDEX sale_settlements_customer_idx ON sale_settlements(customer_id);

CREATE TRIGGER sale_items_immutable BEFORE UPDATE OR DELETE ON sale_items FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER sale_settlements_immutable BEFORE UPDATE OR DELETE ON sale_settlements FOR EACH ROW EXECUTE FUNCTION reject_mutation();

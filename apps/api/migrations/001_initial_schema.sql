-- KUTANA v1 schema. Migration files are applied in lexical numeric order.
-- DDL is intentionally explicit: schema drift must fail loudly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, sort_order integer NOT NULL
);
CREATE TABLE stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('unit', 'volume')),
  unit text NOT NULL CHECK (unit IN ('ea', 'ml')), quantity numeric NOT NULL CHECK (quantity >= 0),
  low_stock_level numeric CHECK (low_stock_level IS NULL OR low_stock_level >= 0), version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL UNIQUE, barcode text UNIQUE, name text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id), price_cents integer NOT NULL CHECK (price_cents >= 0),
  cost_price_cents integer CHECK (cost_price_cents IS NULL OR cost_price_cents >= 0), tax_rate_bp integer NOT NULL CHECK (tax_rate_bp >= 0),
  description text, image_url text, low_stock_level numeric CHECK (low_stock_level IS NULL OR low_stock_level >= 0),
  stock_kind text NOT NULL CHECK (stock_kind IN ('unit', 'volume')), pour_size_ml integer CHECK (pour_size_ml IS NULL OR pour_size_ml IN (500, 750, 1000)),
  stock_item_id uuid REFERENCES stock_items(id), active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK ((stock_kind = 'volume' AND pour_size_ml IS NOT NULL) OR (stock_kind = 'unit' AND pour_size_ml IS NULL))
);
CREATE TABLE restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('free', 'active', 'needs_check', 'paid')), current_order_id uuid, version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), display_name text NOT NULL, phone text, email text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), table_id uuid NOT NULL REFERENCES restaurant_tables(id),
  status text NOT NULL CHECK (status IN ('active', 'needs_check', 'in_review', 'paid', 'closed_with_pending')),
  opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz, customer_id uuid REFERENCES customers(id), version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
ALTER TABLE restaurant_tables ADD CONSTRAINT tables_current_order_fk FOREIGN KEY (current_order_id) REFERENCES orders(id);
CREATE TABLE line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), product_id uuid NOT NULL REFERENCES products(id),
  name_snapshot text NOT NULL, unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0), quantity numeric NOT NULL CHECK (quantity > 0),
  pour_size_ml integer, tax_rate_bp integer NOT NULL CHECK (tax_rate_bp >= 0), tax_cents integer NOT NULL CHECK (tax_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0), is_adjustment boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), stock_item_id uuid NOT NULL REFERENCES stock_items(id), delta numeric NOT NULL,
  reason text NOT NULL, ref_type text NOT NULL, ref_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), label text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'paid', 'void')), version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_item_id uuid NOT NULL UNIQUE REFERENCES line_items(id), ticket_id uuid NOT NULL REFERENCES tickets(id),
  share_bp integer NOT NULL DEFAULT 10000 CHECK (share_bp = 10000)
);
CREATE TABLE payment_methods (
  code text PRIMARY KEY, label text NOT NULL, requires_tendered boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL
);
CREATE TABLE personal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), customer_id uuid REFERENCES customers(id), free_name text,
  status text NOT NULL CHECK (status IN ('open', 'partially_paid', 'pending', 'paid', 'void')), created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), CHECK ((customer_id IS NOT NULL) <> (free_name IS NOT NULL AND btrim(free_name) <> ''))
);
CREATE TABLE account_line_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES personal_accounts(id), line_item_id uuid NOT NULL REFERENCES line_items(id), quantity numeric NOT NULL CHECK (quantity > 0),
  UNIQUE (account_id, line_item_id)
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid REFERENCES personal_accounts(id), customer_id uuid REFERENCES customers(id), ticket_id uuid REFERENCES tickets(id),
  method_code text NOT NULL REFERENCES payment_methods(code), amount_cents integer NOT NULL CHECK (amount_cents > 0), tendered_cents integer, change_cents integer,
  recorded_at timestamptz NOT NULL DEFAULT now(), CHECK (num_nonnulls(account_id, customer_id, ticket_id) = 1), CHECK (tendered_cents IS NULL OR tendered_cents >= amount_cents),
  CHECK (change_cents IS NULL OR change_cents = tendered_cents - amount_cents)
);
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  completed_at timestamptz NOT NULL DEFAULT now(), total_cents integer NOT NULL CHECK (total_cents >= 0), tax_total_cents integer NOT NULL CHECK (tax_total_cents >= 0), customer_id uuid REFERENCES customers(id)
);
CREATE TABLE customer_debt_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), kind text NOT NULL CHECK (kind IN ('pending_account', 'payment', 'adjustment')),
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')), amount_cents integer NOT NULL CHECK (amount_cents > 0), ref_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_stock_item_idx ON products(stock_item_id);
CREATE INDEX orders_table_status_idx ON orders(table_id, status);
CREATE INDEX line_items_order_idx ON line_items(order_id, created_at);
CREATE INDEX stock_movements_item_time_idx ON stock_movements(stock_item_id, occurred_at);
CREATE INDEX payments_account_idx ON payments(account_id);
CREATE INDEX payments_customer_idx ON payments(customer_id);
CREATE INDEX debt_customer_time_idx ON customer_debt_ledger(customer_id, created_at);

CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;
CREATE TRIGGER line_items_immutable BEFORE UPDATE OR DELETE ON line_items FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER payments_immutable BEFORE UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER sales_immutable BEFORE UPDATE OR DELETE ON sales FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER debt_ledger_immutable BEFORE UPDATE OR DELETE ON customer_debt_ledger FOR EACH ROW EXECUTE FUNCTION reject_mutation();

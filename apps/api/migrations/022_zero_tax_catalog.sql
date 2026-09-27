-- New catalog products are tax-free; historical line items retain their stored tax amounts.
ALTER TABLE products
  ALTER COLUMN tax_rate_bp SET DEFAULT 0;

UPDATE products
SET tax_rate_bp = 0,
    version = version + 1
WHERE active = true
  AND tax_rate_bp <> 0;

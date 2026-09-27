-- Replace the volume variants with one canonical unit-priced Kombucha while preserving historical product ids.
INSERT INTO products
  (id, sku, barcode, name, category_id, price_cents, cost_price_cents, tax_rate_bp, description, image_url,
   low_stock_level, stock_kind, pour_size_ml, stock_item_id, active, version)
VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'MENU-KOMBUCHA-UNIT', NULL, 'Kombucha', '11111111-1111-4111-8111-111111111111', 500, NULL, 1200,
   '¡Fresquita! Agua filtrada, azúcar orgánica fermentada, cultivo vivo de kombucha y sabores naturales como frutas, hierbas y especias. (cero alcohol) ABV 0%',
   NULL, NULL, 'unit', NULL, NULL, true, 1);

UPDATE products
SET active = false,
    version = version + 1
WHERE active = true
  AND sku IN ('MENU-KOMBUCHA-330', 'MENU-KOMBUCHA-500', 'MENU-KOMBUCHA-1000');

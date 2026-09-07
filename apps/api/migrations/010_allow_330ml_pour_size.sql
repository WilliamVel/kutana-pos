ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pour_size_ml_check;
ALTER TABLE products ADD CONSTRAINT products_pour_size_ml_check
  CHECK (pour_size_ml IS NULL OR pour_size_ml IN (330, 500, 750, 1000));

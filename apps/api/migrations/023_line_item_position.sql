-- Preserve each line item's stable display order when immutable corrections replace its row.
ALTER TABLE line_items ADD COLUMN position integer;

-- Backfill existing rows while preserving the table's append-only trigger for all
-- future writes. This migration is the one-time schema-owned exception.
ALTER TABLE line_items DISABLE TRIGGER USER;

UPDATE line_items
SET position = ranked.position
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id) - 1 AS position
  FROM line_items
) AS ranked
WHERE line_items.id = ranked.id;

ALTER TABLE line_items ENABLE TRIGGER USER;

ALTER TABLE line_items ALTER COLUMN position SET NOT NULL;
ALTER TABLE line_items ADD CONSTRAINT line_items_order_position_unique UNIQUE (order_id, position);
CREATE INDEX line_items_order_position_idx ON line_items(order_id, position);

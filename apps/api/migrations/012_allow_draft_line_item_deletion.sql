-- Orders can remove mistakenly added line items while still unpaid.
-- The domain service already blocks paid-order edits; keep UPDATE immutable but allow DELETE.
DROP TRIGGER IF EXISTS line_items_immutable ON line_items;

CREATE TRIGGER line_items_immutable
  BEFORE UPDATE ON line_items
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

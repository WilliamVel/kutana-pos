-- Payment identifiers are arbitrary domain strings, not UUIDs.
-- Preserve existing UUID values while allowing contract fixture IDs such as payment-1.
ALTER TABLE payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE payments ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE payments ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

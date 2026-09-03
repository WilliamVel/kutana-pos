-- Billing ticket/allocation identifiers are arbitrary domain strings.
-- Preserve existing UUID values while keeping dependent payment/allocation FKs.
ALTER TABLE allocations DROP CONSTRAINT allocations_ticket_id_fkey;
ALTER TABLE payments DROP CONSTRAINT payments_ticket_id_fkey;

ALTER TABLE tickets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE allocations ALTER COLUMN id DROP DEFAULT;

ALTER TABLE tickets ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE allocations
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN ticket_id TYPE text USING ticket_id::text;
ALTER TABLE payments ALTER COLUMN ticket_id TYPE text USING ticket_id::text;

ALTER TABLE tickets ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE allocations ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE allocations ADD CONSTRAINT allocations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);
ALTER TABLE payments ADD CONSTRAINT payments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);

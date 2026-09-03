import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import type { TicketRepository } from "@kutana/shared/billing/ports/ticket-repository.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface TicketRow {
  id: string;
  order_id: string;
  label: string;
  status: Ticket["status"];
  version: number;
}

interface AllocationRow {
  id: string;
  line_item_id: string;
  ticket_id: string;
  share_bp: number;
}

const mapTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  orderId: row.order_id,
  label: row.label,
  status: row.status,
  version: row.version,
});

const mapAllocation = (row: AllocationRow): Allocation => ({
  id: row.id,
  lineItemId: row.line_item_id,
  ticketId: row.ticket_id,
  shareBp: row.share_bp,
});

@Injectable()
export class PostgresTicketRepository implements TicketRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<Ticket | null> {
    const result = await this.pool.query<TicketRow>(
      "SELECT id, order_id, label, status, version FROM tickets WHERE id = $1",
      [id],
    );
    return result.rows[0] ? mapTicket(result.rows[0]) : null;
  }

  async listByOrder(orderId: string): Promise<Ticket[]> {
    const result = await this.pool.query<TicketRow>(
      "SELECT id, order_id, label, status, version FROM tickets WHERE order_id = $1 ORDER BY id",
      [orderId],
    );
    return result.rows.map(mapTicket);
  }

  async listAllocationsByOrder(orderId: string): Promise<Allocation[]> {
    const result = await this.pool.query<AllocationRow>(
      `SELECT allocations.id, allocations.line_item_id, allocations.ticket_id, allocations.share_bp
       FROM allocations
       INNER JOIN tickets ON tickets.id = allocations.ticket_id
       WHERE tickets.order_id = $1
       ORDER BY allocations.line_item_id, allocations.id`,
      [orderId],
    );
    return result.rows.map(mapAllocation);
  }

  async save(ticket: Ticket, allocations: Allocation[], expectedVersion: number): Promise<Ticket> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<TicketRow>(
        "SELECT id, order_id, label, status, version FROM tickets WHERE id = $1 FOR UPDATE",
        [ticket.id],
      );

      let saved: TicketRow;
      if (existing.rows[0]) {
        if (existing.rows[0].version !== expectedVersion) {
          throw new ConflictError<Ticket>(
            `Ticket ${ticket.id} version conflict: expected ${expectedVersion}, stored ${existing.rows[0].version}`,
            mapTicket(existing.rows[0]),
          );
        }
        const result = await client.query<TicketRow>(
          `UPDATE tickets SET order_id = $1, label = $2, status = $3, version = version + 1
           WHERE id = $4
           RETURNING id, order_id, label, status, version`,
          [ticket.orderId, ticket.label, ticket.status, ticket.id],
        );
        saved = result.rows[0]!;
      } else {
        const result = await client.query<TicketRow>(
          `INSERT INTO tickets (id, order_id, label, status, version)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, order_id, label, status, version`,
          [ticket.id, ticket.orderId, ticket.label, ticket.status, expectedVersion + 1],
        );
        saved = result.rows[0]!;
      }

      await upsertAllocations(client, allocations);
      await client.query("COMMIT");
      return mapTicket(saved);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function upsertAllocations(client: PoolClient, allocations: Allocation[]): Promise<void> {
  for (const allocation of allocations) {
    await client.query(
      `INSERT INTO allocations (id, line_item_id, ticket_id, share_bp)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (line_item_id) DO UPDATE SET
         id = EXCLUDED.id,
         ticket_id = EXCLUDED.ticket_id,
         share_bp = EXCLUDED.share_bp`,
      [allocation.id, allocation.lineItemId, allocation.ticketId, allocation.shareBp],
    );
  }
}

import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type {
  AccountLineAllocation,
  PersonalAccount,
  PersonalAccountOwner,
} from "@kutana/shared/billing/model/personal-account.js";
import type { PersonalAccountRepository } from "@kutana/shared/billing/ports/personal-account-repository.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface PersonalAccountRow {
  id: string;
  order_id: string;
  customer_id: string | null;
  free_name: string | null;
  status: PersonalAccount["status"];
  created_at: Date | string;
  closed_at: Date | string | null;
  version: number;
}

interface AccountLineAllocationRow {
  id: string;
  account_id: string;
  line_item_id: string;
  quantity: string | number;
}

const accountColumns =
  "id, order_id, customer_id, free_name, status, created_at, closed_at, version";

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const nullableIso = (value: Date | string | null): string | null =>
  value === null ? null : iso(value);

const mapOwner = (row: PersonalAccountRow): PersonalAccountOwner =>
  row.customer_id !== null
    ? { kind: "customer", customerId: row.customer_id }
    : { kind: "free_name", freeName: row.free_name ?? "" };

const mapAccount = (row: PersonalAccountRow): PersonalAccount => ({
  id: row.id,
  orderId: row.order_id,
  owner: mapOwner(row),
  status: row.status,
  createdAt: iso(row.created_at),
  closedAt: nullableIso(row.closed_at),
  version: row.version,
});

const mapAllocation = (row: AccountLineAllocationRow): AccountLineAllocation => ({
  id: row.id,
  accountId: row.account_id,
  lineItemId: row.line_item_id,
  quantity: Number(row.quantity),
});

const accountValues = (account: PersonalAccount, version: number): unknown[] => [
  account.id,
  account.orderId,
  account.owner.kind === "customer" ? account.owner.customerId : null,
  account.owner.kind === "free_name" ? account.owner.freeName : null,
  account.status,
  account.createdAt,
  account.closedAt,
  version,
];

@Injectable()
export class PostgresPersonalAccountRepository implements PersonalAccountRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<PersonalAccount | null> {
    const result = await this.pool.query<PersonalAccountRow>(
      `SELECT ${accountColumns} FROM personal_accounts WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async listByOrder(orderId: string): Promise<PersonalAccount[]> {
    const result = await this.pool.query<PersonalAccountRow>(
      `SELECT ${accountColumns} FROM personal_accounts WHERE order_id = $1 ORDER BY id`,
      [orderId],
    );
    return result.rows.map(mapAccount);
  }

  async listPendingFreeName(): Promise<PersonalAccount[]> {
    const result = await this.pool.query<PersonalAccountRow>(
      `SELECT ${accountColumns}
       FROM personal_accounts
       WHERE status = 'pending' AND customer_id IS NULL AND free_name IS NOT NULL
       ORDER BY created_at, id`,
    );
    return result.rows.map(mapAccount);
  }

  async listAllocationsByOrder(orderId: string): Promise<AccountLineAllocation[]> {
    const result = await this.pool.query<AccountLineAllocationRow>(
      `SELECT account_line_allocations.id,
              account_line_allocations.account_id,
              account_line_allocations.line_item_id,
              account_line_allocations.quantity
       FROM account_line_allocations
       INNER JOIN personal_accounts ON personal_accounts.id = account_line_allocations.account_id
       WHERE personal_accounts.order_id = $1
       ORDER BY account_line_allocations.line_item_id, account_line_allocations.id`,
      [orderId],
    );
    return result.rows.map(mapAllocation);
  }

  async save(
    account: PersonalAccount,
    allocations: readonly AccountLineAllocation[],
    expectedVersion: number,
  ): Promise<PersonalAccount> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<PersonalAccountRow>(
        `SELECT ${accountColumns} FROM personal_accounts WHERE id = $1 FOR UPDATE`,
        [account.id],
      );

      let saved: PersonalAccountRow;
      if (existing.rows[0]) {
        if (existing.rows[0].version !== expectedVersion) {
          throw new ConflictError<PersonalAccount>(
            `PersonalAccount ${account.id} version conflict: expected ${expectedVersion}, stored ${existing.rows[0].version}`,
            mapAccount(existing.rows[0]),
          );
        }
        const result = await client.query<PersonalAccountRow>(
          `UPDATE personal_accounts
           SET order_id = $1,
               customer_id = $2,
               free_name = $3,
               status = $4,
               created_at = $5,
               closed_at = $6,
               version = version + 1
           WHERE id = $7
           RETURNING ${accountColumns}`,
          [
            account.orderId,
            account.owner.kind === "customer" ? account.owner.customerId : null,
            account.owner.kind === "free_name" ? account.owner.freeName : null,
            account.status,
            account.createdAt,
            account.closedAt,
            account.id,
          ],
        );
        saved = result.rows[0]!;
      } else {
        const result = await client.query<PersonalAccountRow>(
          `INSERT INTO personal_accounts (id, order_id, customer_id, free_name, status, created_at, closed_at, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING ${accountColumns}`,
          accountValues(account, expectedVersion + 1),
        );
        saved = result.rows[0]!;
      }

      await upsertAllocations(client, allocations);
      await client.query("COMMIT");
      return mapAccount(saved);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async removeAllocation(
    accountId: string,
    allocationId: string,
    expectedVersion: number,
  ): Promise<PersonalAccount> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<PersonalAccountRow>(
        `SELECT ${accountColumns} FROM personal_accounts WHERE id = $1 FOR UPDATE`,
        [accountId],
      );
      if (!existing.rows[0]) throw new Error(`PersonalAccount ${accountId} not found`);
      if (existing.rows[0].version !== expectedVersion) {
        throw new ConflictError<PersonalAccount>(
          `PersonalAccount ${accountId} version conflict: expected ${expectedVersion}, stored ${existing.rows[0].version}`,
          mapAccount(existing.rows[0]),
        );
      }
      await client.query(`DELETE FROM account_line_allocations WHERE id = $1 AND account_id = $2`, [
        allocationId,
        accountId,
      ]);
      const result = await client.query<PersonalAccountRow>(
        `UPDATE personal_accounts SET version = version + 1 WHERE id = $1 RETURNING ${accountColumns}`,
        [accountId],
      );
      await client.query("COMMIT");
      return mapAccount(result.rows[0]!);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string, expectedVersion: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<PersonalAccountRow>(
        `SELECT ${accountColumns} FROM personal_accounts WHERE id = $1 FOR UPDATE`,
        [id],
      );

      if (!existing.rows[0]) {
        await client.query("COMMIT");
        return;
      }

      if (existing.rows[0].version !== expectedVersion) {
        throw new ConflictError<PersonalAccount>(
          `PersonalAccount ${id} version conflict: expected ${expectedVersion}, stored ${existing.rows[0].version}`,
          mapAccount(existing.rows[0]),
        );
      }

      await client.query("DELETE FROM account_line_allocations WHERE account_id = $1", [id]);
      await client.query("DELETE FROM personal_accounts WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function upsertAllocations(
  client: PoolClient,
  allocations: readonly AccountLineAllocation[],
): Promise<void> {
  for (const allocation of allocations) {
    await client.query(
      `INSERT INTO account_line_allocations (id, account_id, line_item_id, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         line_item_id = EXCLUDED.line_item_id,
         quantity = EXCLUDED.quantity`,
      [allocation.id, allocation.accountId, allocation.lineItemId, allocation.quantity],
    );
  }
}

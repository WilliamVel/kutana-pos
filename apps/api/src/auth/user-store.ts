import type { AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";

export const AUTH_USER_STORE = Symbol("AUTH_USER_STORE");

export interface AuthUserRecord {
  readonly id: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly pinHash: string;
  readonly deactivatedAt: Date | string | null;
}

export interface CreateAuthUserInput {
  readonly displayName: string;
  readonly role: AuthRole;
  readonly pinHash: string;
}

export interface AuthUserStore {
  readonly findActiveByDisplayName: (displayName: string) => Promise<AuthUserRecord | null>;
  readonly findActiveById: (id: string) => Promise<AuthUserRecord | null>;
  readonly listUsers: () => Promise<readonly AuthUserRecord[]>;
  readonly createUser: (input: CreateAuthUserInput) => Promise<AuthUserRecord>;
  readonly deactivateUser: (id: string) => Promise<AuthUserRecord | null>;
}

interface AuthUserRow {
  readonly id: string;
  readonly display_name: string;
  readonly role: AuthRole;
  readonly pin_hash: string;
  readonly deactivated_at: Date | string | null;
}

@Injectable()
export class PostgresAuthUserStore implements AuthUserStore {
  constructor(private readonly pool: PostgresPool) {}

  async findActiveByDisplayName(displayName: string): Promise<AuthUserRecord | null> {
    await this.bootstrapFirstAdminIfConfigured();
    const result = await this.pool.query<AuthUserRow>(
      `SELECT id, display_name, role, pin_hash, deactivated_at
       FROM auth_users
       WHERE lower(display_name) = lower($1) AND deactivated_at IS NULL
       LIMIT 1`,
      [displayName],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findActiveById(id: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query<AuthUserRow>(
      `SELECT id, display_name, role, pin_hash, deactivated_at
       FROM auth_users
       WHERE id = $1 AND deactivated_at IS NULL
       LIMIT 1`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listUsers(): Promise<readonly AuthUserRecord[]> {
    const result = await this.pool.query<AuthUserRow>(
      `SELECT id, display_name, role, pin_hash, deactivated_at
       FROM auth_users
       ORDER BY lower(display_name), id`,
    );
    return result.rows.map(mapRow);
  }

  async createUser(input: CreateAuthUserInput): Promise<AuthUserRecord> {
    const result = await this.pool.query<AuthUserRow>(
      `INSERT INTO auth_users (id, display_name, role, pin_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, role, pin_hash, deactivated_at`,
      [randomUUID(), input.displayName, input.role, input.pinHash],
    );
    return mapRequiredRow(result.rows[0]);
  }

  async deactivateUser(id: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query<AuthUserRow>(
      `UPDATE auth_users
       SET deactivated_at = COALESCE(deactivated_at, now()), updated_at = now()
       WHERE id = $1
       RETURNING id, display_name, role, pin_hash, deactivated_at`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  private async bootstrapFirstAdminIfConfigured(): Promise<void> {
    const displayName = process.env.AUTH_BOOTSTRAP_ADMIN_OPERATOR?.trim();
    const pinHash = process.env.AUTH_BOOTSTRAP_ADMIN_PIN_HASH?.trim();
    if (!displayName || !pinHash) return;

    await this.pool.query(
      `INSERT INTO auth_users (id, display_name, role, pin_hash)
       SELECT $1, $2, 'admin', $3
       WHERE NOT EXISTS (SELECT 1 FROM auth_users)`,
      [randomUUID(), displayName, pinHash],
    );
  }
}

function mapRequiredRow(row: AuthUserRow | undefined): AuthUserRecord {
  if (!row) throw new Error("Expected auth_users RETURNING row");
  return mapRow(row);
}

function mapRow(row: AuthUserRow): AuthUserRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    pinHash: row.pin_hash,
    deactivatedAt: row.deactivated_at,
  };
}

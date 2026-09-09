import { Injectable } from "@nestjs/common";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";

export const REFRESH_TOKEN_STORE = Symbol("REFRESH_TOKEN_STORE");

export interface RefreshTokenRecord {
  readonly operatorId: string;
  readonly expiresAtMs: number;
}

export interface RefreshTokenStore {
  readonly save: (input: {
    readonly tokenHash: string;
    readonly operatorId: string;
    readonly expiresAtMs: number;
  }) => Promise<void>;
  readonly consume: (tokenHash: string) => Promise<RefreshTokenRecord | null>;
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  async save(input: {
    readonly tokenHash: string;
    readonly operatorId: string;
    readonly expiresAtMs: number;
  }): Promise<void> {
    this.refreshTokens.set(input.tokenHash, {
      operatorId: input.operatorId,
      expiresAtMs: input.expiresAtMs,
    });
  }

  async consume(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = this.refreshTokens.get(tokenHash) ?? null;
    this.refreshTokens.delete(tokenHash);
    return record;
  }
}

interface RefreshTokenRow {
  readonly operator_id: string;
  readonly expires_at: Date | string;
}

@Injectable()
export class PostgresRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly pool: PostgresPool) {}

  async save(input: {
    readonly tokenHash: string;
    readonly operatorId: string;
    readonly expiresAtMs: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_refresh_tokens (token_hash, operator_id, expires_at)
       VALUES ($1, $2, $3)`,
      [input.tokenHash, input.operatorId, new Date(input.expiresAtMs)],
    );
  }

  async consume(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `DELETE FROM auth_refresh_tokens
       WHERE token_hash = $1
       RETURNING operator_id, expires_at`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      operatorId: row.operator_id,
      expiresAtMs: new Date(row.expires_at).getTime(),
    };
  }
}

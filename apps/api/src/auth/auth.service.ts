import type { AuthRole, AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  InMemoryRefreshTokenStore,
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from "./refresh-token-store.js";
import { AUTH_USER_STORE, type AuthUserRecord, type AuthUserStore } from "./user-store.js";

interface OperatorRecord {
  readonly id: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly pin?: string;
  readonly pinHash?: string;
}

export interface TokenPayload {
  readonly sub: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly exp: number;
  readonly jti: string;
}

const TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DEVELOPMENT_OPERATOR: OperatorRecord = {
  id: "operator-mina",
  displayName: "Mina",
  role: "admin",
  pin: "1234",
};

@Injectable()
export class AuthService {
  private readonly operators: readonly OperatorRecord[];
  private readonly secret: string;
  private readonly refreshTokenStore: RefreshTokenStore;
  private readonly userStore: AuthUserStore | null;

  constructor(
    @Optional()
    @Inject(REFRESH_TOKEN_STORE)
    refreshTokenStore?: RefreshTokenStore,
    @Optional()
    @Inject(AUTH_USER_STORE)
    userStore?: AuthUserStore,
  ) {
    this.operators = parseOperators(process.env.AUTH_OPERATORS);
    this.secret = process.env.AUTH_SESSION_SECRET ?? "dev-only-auth-session-secret-change-me";
    this.refreshTokenStore = refreshTokenStore ?? new InMemoryRefreshTokenStore();
    this.userStore = userStore ?? null;
  }

  async login(input: { readonly operator: string; readonly pin: string }): Promise<AuthSession> {
    const displayName = input.operator.trim();
    const user = await this.findLoginUser(displayName);
    if (!user || !this.matchesPin(user, input.pin)) {
      throw new UnauthorizedException("Invalid operator credentials");
    }

    return this.issueSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");

    const tokenHash = this.hashRefreshToken(refreshToken);
    const record = await this.refreshTokenStore.consume(tokenHash);

    if (!record) throw new UnauthorizedException("Invalid refresh token");
    if (record.expiresAtMs <= Date.now()) throw new UnauthorizedException("Expired refresh token");

    const user = await this.findActiveUserById(record.operatorId);
    if (!user) throw new UnauthorizedException("Unknown operator");

    return this.issueSession(user);
  }

  validateBearerToken(header: string | undefined): TokenPayload {
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Missing bearer token");
    return this.validateToken(header.slice("Bearer ".length));
  }

  validateToken(token: string): TokenPayload {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) throw new UnauthorizedException("Invalid bearer token");

    const expectedSignature = this.signature(encodedPayload);
    if (!constantTimeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    let payload: TokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as TokenPayload;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }

    if (payload.exp <= Date.now()) throw new UnauthorizedException("Expired bearer token");
    if (!isAuthRole(payload.role)) throw new UnauthorizedException("Invalid bearer token");

    return payload;
  }

  async listUsers(): Promise<readonly PublicUserRecord[]> {
    if (!this.userStore) return this.operators.map(toPublicOperatorRecord);
    return (await this.userStore.listUsers()).map(toPublicUserRecord);
  }

  async createUser(input: {
    readonly displayName: string;
    readonly role: AuthRole;
    readonly pin: string;
  }): Promise<PublicUserRecord> {
    if (!this.userStore) throw new UnauthorizedException("Persisted user management is unavailable");
    const user = await this.userStore.createUser({
      displayName: input.displayName.trim(),
      role: input.role,
      pinHash: hashPin(input.pin),
    });
    return toPublicUserRecord(user);
  }

  async deactivateUser(id: string): Promise<PublicUserRecord | null> {
    if (!this.userStore) throw new UnauthorizedException("Persisted user management is unavailable");
    const user = await this.userStore.deactivateUser(id);
    return user ? toPublicUserRecord(user) : null;
  }

  private async findLoginUser(displayName: string): Promise<LoginUser | null> {
    if (this.userStore) return this.userStore.findActiveByDisplayName(displayName);
    return this.operators.find((candidate) => candidate.displayName === displayName) ?? null;
  }

  private async findActiveUserById(id: string): Promise<LoginUser | null> {
    if (this.userStore) return this.userStore.findActiveById(id);
    return this.operators.find((operator) => operator.id === id) ?? null;
  }

  private async issueSession(user: LoginUser): Promise<AuthSession> {
    const expiresAtMs = Date.now() + TOKEN_TTL_MS;
    const refreshExpiresAtMs = Date.now() + REFRESH_TOKEN_TTL_MS;
    const refreshToken = randomBytes(32).toString("base64url");
    await this.refreshTokenStore.save({
      tokenHash: this.hashRefreshToken(refreshToken),
      operatorId: user.id,
      expiresAtMs: refreshExpiresAtMs,
    });

    const payload: TokenPayload = {
      sub: user.id,
      displayName: user.displayName,
      role: user.role,
      exp: expiresAtMs,
      jti: randomBytes(16).toString("base64url"),
    };

    return {
      operatorId: user.id,
      displayName: user.displayName,
      role: user.role,
      token: this.signPayload(payload),
      expiresAt: new Date(expiresAtMs).toISOString(),
      refreshToken,
      refreshExpiresAt: new Date(refreshExpiresAtMs).toISOString(),
    };
  }

  private matchesPin(user: LoginUser, pin: string): boolean {
    if (user.pinHash) return constantTimeEqual(hashPin(pin), user.pinHash);
    return user.pin !== undefined && constantTimeEqual(pin, user.pin);
  }

  private signPayload(payload: TokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return `${encodedPayload}.${this.signature(encodedPayload)}`;
  }

  private signature(encodedPayload: string): string {
    return createHmac("sha256", this.secret).update(encodedPayload).digest("base64url");
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac("sha256", this.secret).update(refreshToken).digest("base64url");
  }
}

export interface PublicUserRecord {
  readonly id: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly deactivatedAt: string | null;
}

type LoginUser = OperatorRecord | AuthUserRecord;

function parseOperators(raw: string | undefined): readonly OperatorRecord[] {
  if (!raw) {
    // Development/test fallback only: production should configure persisted auth_users.
    return [DEFAULT_DEVELOPMENT_OPERATOR];
  }

  const parsed = JSON.parse(raw) as readonly OperatorRecord[];
  if (!Array.isArray(parsed)) throw new Error("AUTH_OPERATORS must be a JSON array");
  return parsed.map((operator) => ({ ...operator, role: operator.role ?? "operator" }));
}

function hashPin(pin: string): string {
  return createHmac(
    "sha256",
    process.env.AUTH_SESSION_SECRET ?? "dev-only-auth-session-secret-change-me",
  )
    .update(pin)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthRole(role: string): role is AuthRole {
  return role === "admin" || role === "operator";
}

function toPublicUserRecord(user: AuthUserRecord): PublicUserRecord {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    deactivatedAt: user.deactivatedAt ? new Date(user.deactivatedAt).toISOString() : null,
  };
}

function toPublicOperatorRecord(user: OperatorRecord): PublicUserRecord {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    deactivatedAt: null,
  };
}

export function createPinHash(pin: string): string {
  return hashPin(pin);
}

export function randomAuthSecret(): string {
  return randomBytes(32).toString("base64url");
}

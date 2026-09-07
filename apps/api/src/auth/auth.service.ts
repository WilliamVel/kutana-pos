import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

interface OperatorRecord {
  readonly id: string;
  readonly displayName: string;
  readonly pin?: string;
  readonly pinHash?: string;
}

interface TokenPayload {
  readonly sub: string;
  readonly displayName: string;
  readonly exp: number;
}

const TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly operators: readonly OperatorRecord[];
  private readonly secret: string;

  constructor() {
    this.operators = parseOperators(process.env.AUTH_OPERATORS);
    this.secret = process.env.AUTH_SESSION_SECRET ?? "dev-only-auth-session-secret-change-me";
  }

  login(input: { readonly operator: string; readonly pin: string }): AuthSession {
    const operator = this.operators.find(
      (candidate) => candidate.displayName === input.operator.trim(),
    );
    if (!operator || !this.matchesPin(operator, input.pin)) {
      throw new UnauthorizedException("Invalid operator credentials");
    }

    const expiresAtMs = Date.now() + TOKEN_TTL_MS;
    const payload: TokenPayload = {
      sub: operator.id,
      displayName: operator.displayName,
      exp: expiresAtMs,
    };

    return {
      operatorId: operator.id,
      displayName: operator.displayName,
      token: this.signPayload(payload),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
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
    if (!this.operators.some((operator) => operator.id === payload.sub)) {
      throw new UnauthorizedException("Unknown operator");
    }

    return payload;
  }

  private matchesPin(operator: OperatorRecord, pin: string): boolean {
    if (operator.pinHash) return constantTimeEqual(hashPin(pin), operator.pinHash);
    return operator.pin !== undefined && constantTimeEqual(pin, operator.pin);
  }

  private signPayload(payload: TokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    return `${encodedPayload}.${this.signature(encodedPayload)}`;
  }

  private signature(encodedPayload: string): string {
    return createHmac("sha256", this.secret).update(encodedPayload).digest("base64url");
  }
}

function parseOperators(raw: string | undefined): readonly OperatorRecord[] {
  if (!raw) {
    // Development/test fallback only: production should set AUTH_OPERATORS and AUTH_SESSION_SECRET.
    return [{ id: "operator-mina", displayName: "Mina", pin: "1234" }];
  }

  const parsed = JSON.parse(raw) as readonly OperatorRecord[];
  if (!Array.isArray(parsed)) throw new Error("AUTH_OPERATORS must be a JSON array");
  return parsed;
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

export function createPinHash(pin: string): string {
  return hashPin(pin);
}

export function randomAuthSecret(): string {
  return randomBytes(32).toString("base64url");
}

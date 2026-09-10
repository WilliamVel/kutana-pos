import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService, createPinHash } from "./auth.service.js";
import type { AuthUserRecord, AuthUserStore, CreateAuthUserInput } from "./user-store.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.useRealTimers();
});

class FakeAuthUserStore implements AuthUserStore {
  readonly users = new Map<string, AuthUserRecord>();

  constructor(users: readonly AuthUserRecord[]) {
    for (const user of users) this.users.set(user.id, user);
  }

  async findActiveByDisplayName(displayName: string): Promise<AuthUserRecord | null> {
    return (
      [...this.users.values()].find(
        (user) => user.displayName === displayName && user.deactivatedAt === null,
      ) ?? null
    );
  }

  async findActiveById(id: string): Promise<AuthUserRecord | null> {
    const user = this.users.get(id) ?? null;
    return user?.deactivatedAt === null ? user : null;
  }

  async listUsers(): Promise<readonly AuthUserRecord[]> {
    return [...this.users.values()];
  }

  async createUser(input: CreateAuthUserInput): Promise<AuthUserRecord> {
    const user: AuthUserRecord = {
      id: `user-${this.users.size + 1}`,
      displayName: input.displayName,
      role: input.role,
      pinHash: input.pinHash,
      deactivatedAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updatePin(id: string, pinHash: string): Promise<AuthUserRecord | null> {
        const user = this.users.get(id);
        if (!user || user.deactivatedAt !== null) return null;
        const updated = { ...user, pinHash };
        this.users.set(id, updated);
        return updated;
      }

      async deactivateUser(id: string): Promise<AuthUserRecord | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const deactivated = { ...user, deactivatedAt: new Date("2025-01-01T00:00:00.000Z") };
    this.users.set(id, deactivated);
    return deactivated;
  }
}

describe("AuthService", () => {
  it("accepts the deterministic development operator and rejects arbitrary credentials", async () => {
    delete process.env.AUTH_OPERATORS;
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const service = new AuthService();

    const session = await service.login({ operator: "Mina", pin: "1234" });

    expect(session).toMatchObject({ operatorId: "operator-mina", displayName: "Mina", role: "admin" });
    await expect(service.login({ operator: "Mina", pin: "9999" })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login({ operator: "Someone", pin: "1234" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("loads operators from AUTH_OPERATORS and supports pinHash entries", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret";
    process.env.AUTH_OPERATORS = JSON.stringify([
      { id: "op-1", displayName: "Ada", role: "operator", pinHash: createPinHash("2468") },
    ]);
    const service = new AuthService();

    await expect(service.login({ operator: "Ada", pin: "2468" })).resolves.toMatchObject({
      operatorId: "op-1",
      displayName: "Ada",
      role: "operator",
    });
    await expect(service.login({ operator: "Mina", pin: "1234" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("authenticates persisted users, carries their role in sessions, and rejects deactivated users", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const store = new FakeAuthUserStore([
      {
        id: "admin-1",
        displayName: "Ada",
        role: "admin",
        pinHash: createPinHash("2468"),
        deactivatedAt: null,
      },
      {
        id: "operator-1",
        displayName: "Mina",
        role: "operator",
        pinHash: createPinHash("1234"),
        deactivatedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    ]);
    const service = new AuthService(undefined, store);

    const session = await service.login({ operator: "Ada", pin: "2468" });

    expect(session).toMatchObject({ operatorId: "admin-1", displayName: "Ada", role: "admin" });
    expect(service.validateBearerToken(`Bearer ${session.token}`)).toMatchObject({
      sub: "admin-1",
      role: "admin",
    });
    await expect(service.login({ operator: "Mina", pin: "1234" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("validates signed short-lived bearer tokens and rejects tampering", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const service = new AuthService();
    const session = await service.login({ operator: "Mina", pin: "1234" });

    expect(service.validateBearerToken(`Bearer ${session.token}`)).toMatchObject({
      sub: "operator-mina",
      displayName: "Mina",
      role: "admin",
    });
    expect(() => service.validateToken(`${session.token}x`)).toThrow(UnauthorizedException);

    vi.setSystemTime(new Date("2025-01-01T00:16:00.000Z"));
    expect(() => service.validateBearerToken(`Bearer ${session.token}`)).toThrow(
      UnauthorizedException,
    );
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const service = new AuthService();
    const session = await service.login({ operator: "Mina", pin: "1234" });

    const refreshed = await service.refresh(session.refreshToken);

    expect(refreshed.token).not.toBe(session.token);
    expect(refreshed.refreshToken).not.toBe(session.refreshToken);
    await expect(service.refresh(session.refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(service.validateBearerToken(`Bearer ${refreshed.token}`)).toMatchObject({
      sub: "operator-mina",
      role: "admin",
    });
  });
});

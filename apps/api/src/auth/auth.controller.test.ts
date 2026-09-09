import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller.js";
import { AuthService, createPinHash } from "./auth.service.js";
import type { AuthUserRecord, AuthUserStore, CreateAuthUserInput } from "./user-store.js";
import { AUTH_USER_STORE } from "./user-store.js";

class FakeAuthUserStore implements AuthUserStore {
  readonly users = new Map<string, AuthUserRecord>();

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

  async deactivateUser(id: string): Promise<AuthUserRecord | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const deactivated = { ...user, deactivatedAt: new Date("2025-01-01T00:00:00.000Z") };
    this.users.set(id, deactivated);
    return deactivated;
  }
}

describe("AuthController", () => {
  it("posts credentials to AuthService and returns an auth session", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();
    const controller = moduleRef.get(AuthController);

    const session = await controller.login({ operator: "Mina", pin: "1234" });

    expect(session).toMatchObject({
      operatorId: "operator-mina",
      displayName: "Mina",
      role: "admin",
    });
    await expect(controller.refresh({ refreshToken: session.refreshToken })).resolves.toMatchObject({
      operatorId: "operator-mina",
      displayName: "Mina",
      role: "admin",
    });
  });

  it("lists, creates, and soft-deactivates persisted users for admin routes", async () => {
    const store = new FakeAuthUserStore();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService, { provide: AUTH_USER_STORE, useValue: store }],
    }).compile();
    const controller = moduleRef.get(AuthController);

    const created = await controller.createUser({
      displayName: "Ollie",
      role: "operator",
      pin: "1357",
    });

    expect(created).toMatchObject({ displayName: "Ollie", role: "operator", deactivatedAt: null });
    expect(created).not.toHaveProperty("pinHash");
    expect(store.users.get(created.id)?.pinHash).toBe(createPinHash("1357"));
    await expect(controller.listUsers()).resolves.toEqual([created]);

    const deactivated = await controller.deactivateUser(created.id);
    expect(deactivated).toMatchObject({ id: created.id, deactivatedAt: "2025-01-01T00:00:00.000Z" });
    await expect(controller.deactivateUser("missing-user")).rejects.toThrow(NotFoundException);
  });
});

import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService, createPinHash } from "./auth.service.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.useRealTimers();
});

describe("AuthService", () => {
  it("accepts the deterministic development operator and rejects arbitrary credentials", () => {
    delete process.env.AUTH_OPERATORS;
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const service = new AuthService();

    const session = service.login({ operator: "Mina", pin: "1234" });

    expect(session).toMatchObject({ operatorId: "operator-mina", displayName: "Mina" });
    expect(() => service.login({ operator: "Mina", pin: "9999" })).toThrow(UnauthorizedException);
    expect(() => service.login({ operator: "Someone", pin: "1234" })).toThrow(
      UnauthorizedException,
    );
  });

  it("loads operators from AUTH_OPERATORS and supports pinHash entries", () => {
    process.env.AUTH_SESSION_SECRET = "test-secret";
    process.env.AUTH_OPERATORS = JSON.stringify([
      { id: "op-1", displayName: "Ada", pinHash: createPinHash("2468") },
    ]);
    const service = new AuthService();

    expect(service.login({ operator: "Ada", pin: "2468" })).toMatchObject({
      operatorId: "op-1",
      displayName: "Ada",
    });
    expect(() => service.login({ operator: "Mina", pin: "1234" })).toThrow(UnauthorizedException);
  });

  it("validates signed short-lived bearer tokens and rejects tampering", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    process.env.AUTH_SESSION_SECRET = "test-secret";
    const service = new AuthService();
    const session = service.login({ operator: "Mina", pin: "1234" });

    expect(service.validateBearerToken(`Bearer ${session.token}`)).toMatchObject({
      sub: "operator-mina",
      displayName: "Mina",
    });
    expect(() => service.validateToken(`${session.token}x`)).toThrow(UnauthorizedException);

    vi.setSystemTime(new Date("2025-01-01T00:16:00.000Z"));
    expect(() => service.validateBearerToken(`Bearer ${session.token}`)).toThrow(
      UnauthorizedException,
    );
  });
});

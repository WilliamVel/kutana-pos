import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";
import { RequireRole } from "./roles.decorator.js";

class ProtectedController {}
class PublicController {
  @Public()
  health(): void {
    return undefined;
  }
}
class AdminController {
  @RequireRole("admin")
  manageUsers(): void {
    return undefined;
  }
}

function contextFor(
  handler: () => void,
  input: { readonly authorization?: string; readonly accessToken?: string } = {},
): ExecutionContext {
  const request = {
    headers: { authorization: input.authorization },
    query: { access_token: input.accessToken },
  };
  return {
    getHandler: () => handler,
    getClass: () => ProtectedController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  it("allows public routes without a bearer token", () => {
    const guard = new AuthGuard(new AuthService(), new Reflector());
    const handler = new PublicController().health;

    expect(guard.canActivate(contextFor(handler))).toBe(true);
  });

  it("requires a valid bearer token for protected routes and attaches authenticated identity", async () => {
    const service = new AuthService();
    const guard = new AuthGuard(service, new Reflector());
    const session = await service.login({ operator: "Mina", pin: "1234" });
    const context = contextFor(() => undefined, { authorization: `Bearer ${session.token}` });

    expect(guard.canActivate(context)).toBe(true);
    expect(context.switchToHttp().getRequest<{ auth: unknown }>().auth).toMatchObject({
      sub: "operator-mina",
      role: "admin",
    });
    expect(() => guard.canActivate(contextFor(() => undefined))).toThrow(UnauthorizedException);
  });

  it("accepts a query access token for browser EventSource subscriptions", async () => {
    const service = new AuthService();
    const guard = new AuthGuard(service, new Reflector());
    const session = await service.login({ operator: "Mina", pin: "1234" });

    expect(guard.canActivate(contextFor(() => undefined, { accessToken: session.token }))).toBe(
      true,
    );
  });

  it("enforces admin-only routes", async () => {
    process.env.AUTH_OPERATORS = JSON.stringify([
      { id: "op-1", displayName: "Ollie", role: "operator", pin: "1234" },
      { id: "admin-1", displayName: "Ada", role: "admin", pin: "2468" },
    ]);
    const service = new AuthService();
    const guard = new AuthGuard(service, new Reflector());
    const handler = new AdminController().manageUsers;
    const operator = await service.login({ operator: "Ollie", pin: "1234" });
    const admin = await service.login({ operator: "Ada", pin: "2468" });

    expect(() =>
      guard.canActivate(contextFor(handler, { authorization: `Bearer ${operator.token}` })),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor(handler, { authorization: `Bearer ${admin.token}` }))).toBe(
      true,
    );
  });
});

import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";

class ProtectedController {}
class PublicController {
  @Public()
  health(): void {
    return undefined;
  }
}

function contextFor(
  handler: () => void,
  input: { readonly authorization?: string; readonly accessToken?: string } = {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ProtectedController,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: input.authorization },
        query: { access_token: input.accessToken },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  it("allows public routes without a bearer token", () => {
    const guard = new AuthGuard(new AuthService(), new Reflector());
    const handler = new PublicController().health;

    expect(guard.canActivate(contextFor(handler))).toBe(true);
  });

  it("requires a valid bearer token for protected routes", () => {
    const service = new AuthService();
    const guard = new AuthGuard(service, new Reflector());
    const session = service.login({ operator: "Mina", pin: "1234" });

    expect(
      guard.canActivate(contextFor(() => undefined, { authorization: `Bearer ${session.token}` })),
    ).toBe(true);
    expect(() => guard.canActivate(contextFor(() => undefined))).toThrow(UnauthorizedException);
  });

  it("accepts a query access token for browser EventSource subscriptions", () => {
    const service = new AuthService();
    const guard = new AuthGuard(service, new Reflector());
    const session = service.login({ operator: "Mina", pin: "1234" });

    expect(guard.canActivate(contextFor(() => undefined, { accessToken: session.token }))).toBe(
      true,
    );
  });
});

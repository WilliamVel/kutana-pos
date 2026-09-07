import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { HttpAuthService } from "./auth-service.js";

const BASE_URL = "http://api.example.test";

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

const session: AuthSession = {
  operatorId: "operator-mina",
  displayName: "Mina",
  token: "signed-token",
  expiresAt: "2025-01-01T00:15:00.000Z",
};

function createFetch(): { readonly fetchImpl: typeof fetch; readonly calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

describe("HttpAuthService", () => {
  it("posts credentials to the backend login endpoint and stores the issued session", async () => {
    const { fetchImpl, calls } = createFetch();
    const service = new HttpAuthService({ baseUrl: BASE_URL, fetchImpl });

    await expect(service.login({ operator: "Mina", pin: "1234" })).resolves.toEqual(session);

    expect(calls[0]?.url).toBe(`${BASE_URL}/auth/login`);
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ operator: "Mina", pin: "1234" });
    expect((calls[0]?.init.headers as Headers).get("Authorization")).toBeNull();
    expect(service.currentSession()).toEqual(session);
  });

  it("clears the stored session on logout", async () => {
    const { fetchImpl } = createFetch();
    const service = new HttpAuthService({ baseUrl: BASE_URL, fetchImpl });

    await service.login({ operator: "Mina", pin: "1234" });
    service.logout();

    expect(service.currentSession()).toBeNull();
  });
});

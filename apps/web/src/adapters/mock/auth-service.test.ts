import { describe, expect, it } from "vitest";
import { MockAuthService } from "./auth-service.js";

describe("MockAuthService", () => {
  it("only accepts deterministic demo credentials", async () => {
    const service = new MockAuthService();

    await expect(service.login({ operator: "Mina", pin: "1234" })).resolves.toMatchObject({
      operatorId: "operator-mina",
      displayName: "Mina",
    });
    await expect(service.login({ operator: "Mina", pin: "0000" })).rejects.toThrow(
      "Invalid operator credentials",
    );
    await expect(service.login({ operator: "Anyone", pin: "1234" })).rejects.toThrow(
      "Invalid operator credentials",
    );
  });

  it("tracks and clears the current session", async () => {
    const service = new MockAuthService();

    expect(service.currentSession()).toBeNull();
    const session = await service.login({ operator: "Mina", pin: "1234" });
    expect(service.currentSession()).toEqual(session);

    service.logout();
    expect(service.currentSession()).toBeNull();
  });
});

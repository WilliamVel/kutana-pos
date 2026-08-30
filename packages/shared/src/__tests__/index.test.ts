import { describe, expect, it } from "vitest";
import { SHARED_PACKAGE_NAME } from "../index.js";

describe("@kutana/shared package scaffolding", () => {
  it("exposes its package identity, proving Vitest runs in this workspace", () => {
    expect(SHARED_PACKAGE_NAME).toBe("@kutana/shared");
  });
});

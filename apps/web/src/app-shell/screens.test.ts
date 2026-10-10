import { describe, expect, it } from "vitest";
import { screenFromPath, screenPath } from "./screens.js";

describe("screen routes", () => {
  it("maps top-level screens to stable browser paths", () => {
    expect(screenPath("register")).toBe("/orders");
    expect(screenPath("inventory")).toBe("/inventory");
    expect(screenPath("customers")).toBe("/customers");
    expect(screenPath("pending-debts")).toBe("/pending-debts");
  });

  it("supports the root alias and falls back safely for unknown paths", () => {
    expect(screenFromPath("/")).toBe("register");
    expect(screenFromPath("/orders")).toBe("register");
    expect(screenFromPath("/inventory")).toBe("inventory");
    expect(screenFromPath("/not-a-screen")).toBe("register");
  });
});

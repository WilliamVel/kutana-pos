import { describe, expect, it } from "vitest";
import { Money } from "./money.js";

describe("Money", () => {
  it("creates a Money value from integer cents", () => {
    const price = Money.fromCents(250);
    expect(price.cents).toBe(250);
  });

  it("rejects a fractional (float) cents input", () => {
    expect(() => Money.fromCents(2.5)).toThrow(/integer/i);
  });

  it("rejects a negative cents input", () => {
    expect(() => Money.fromCents(-10)).toThrow(/negative/i);
  });

  it("rejects NaN", () => {
    expect(() => Money.fromCents(Number.NaN)).toThrow(/integer/i);
  });

  it("adds two Money values in integer cents, never floats", () => {
    const a = Money.fromCents(100);
    const b = Money.fromCents(250);
    expect(a.add(b).cents).toBe(350);
  });

  it("classic float trap: 0.1 + 0.2 !== 0.3 does not corrupt cent arithmetic", () => {
    // If Money internally used dollars-as-floats, 10 cents + 20 cents
    // expressed as 0.10 + 0.20 would NOT equal exactly 0.30 in IEEE-754.
    // Money must operate purely on integer cents so this never surfaces.
    const a = Money.fromCents(10);
    const b = Money.fromCents(20);
    expect(a.add(b).cents).toBe(30);
    expect(0.1 + 0.2 === 0.3).toBe(false); // documents the reason Money exists
  });

  it("subtracts two Money values in integer cents", () => {
    const a = Money.fromCents(500);
    const b = Money.fromCents(200);
    expect(a.subtract(b).cents).toBe(300);
  });

  it("rejects subtraction that would produce a negative result", () => {
    const a = Money.fromCents(100);
    const b = Money.fromCents(200);
    expect(() => a.subtract(b)).toThrow(/negative/i);
  });

  it("multiplies by an integer quantity", () => {
    const unitPrice = Money.fromCents(150);
    expect(unitPrice.multiply(3).cents).toBe(450);
  });

  it("rejects multiplying by a non-integer quantity", () => {
    const unitPrice = Money.fromCents(150);
    expect(() => unitPrice.multiply(1.5)).toThrow(/integer/i);
  });

  it("compares equality by cents value", () => {
    expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).equals(Money.fromCents(101))).toBe(false);
  });

  it("is zero for Money.zero()", () => {
    expect(Money.zero().cents).toBe(0);
  });

  it("rejects constructing directly from a float dollar amount", () => {
    // Money.fromCents is the ONLY entry point; there is no fromDollars(2.5)
    // API, because that would reintroduce float arithmetic at the boundary.
    expect(() => Money.fromCents(2.5)).toThrow(/integer/i);
  });
});

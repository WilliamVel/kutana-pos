import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { largestRemainderSplit } from "./largest-remainder.js";

describe("largestRemainderSplit", () => {
  it("splits an indivisible total across 3 tickets, giving the extra cent to one", () => {
    const parts = largestRemainderSplit(1000, [1, 1, 1]);
    expect(parts.reduce((sum, p) => sum + p, 0)).toBe(1000);
    expect(parts).toContain(334);
    expect(parts.filter((p) => p === 333)).toHaveLength(2);
  });

  it("splits an indivisible total across 7 tickets exactly", () => {
    const parts = largestRemainderSplit(100, [1, 1, 1, 1, 1, 1, 1]);
    expect(parts.reduce((sum, p) => sum + p, 0)).toBe(100);
    // 100 / 7 = 14 remainder 2 -> five parts of 14, two parts of 15
    expect(parts.filter((p) => p === 15)).toHaveLength(2);
    expect(parts.filter((p) => p === 14)).toHaveLength(5);
  });

  it("rejects a total that is not an integer", () => {
    expect(() => largestRemainderSplit(10.5, [1, 1])).toThrow(/integer/i);
  });

  it("rejects a negative total", () => {
    expect(() => largestRemainderSplit(-100, [1, 1])).toThrow(/negative/i);
  });

  it("rejects an empty weights array", () => {
    expect(() => largestRemainderSplit(100, [])).toThrow(/weight/i);
  });

  it("rejects a zero or negative weight", () => {
    expect(() => largestRemainderSplit(100, [1, 0])).toThrow(/weight/i);
    expect(() => largestRemainderSplit(100, [1, -1])).toThrow(/weight/i);
  });

  it("handles a single weight by giving it the entire total", () => {
    const parts = largestRemainderSplit(777, [1]);
    expect(parts).toEqual([777]);
  });

  it("handles a total smaller than the number of weights without losing or inventing cents", () => {
    const parts = largestRemainderSplit(2, [1, 1, 1, 1, 1]);
    expect(parts.reduce((sum, p) => sum + p, 0)).toBe(2);
    expect(parts.filter((p) => p === 1)).toHaveLength(2);
    expect(parts.filter((p) => p === 0)).toHaveLength(3);
  });

  it("handles a zero total by returning all zero parts", () => {
    const parts = largestRemainderSplit(0, [1, 1, 1]);
    expect(parts).toEqual([0, 0, 0]);
  });

  it("respects unequal weights proportionally", () => {
    // total 100, weights 3:1 -> ideal 75 / 25
    const parts = largestRemainderSplit(100, [3, 1]);
    expect(parts.reduce((sum, p) => sum + p, 0)).toBe(100);
    expect(parts).toEqual([75, 25]);
  });

  it("property: the sum of parts always equals the total exactly, for any valid random input", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 1, max: 10_000 }), {
          minLength: 1,
          maxLength: 50,
        }),
        (total, weights) => {
          const parts = largestRemainderSplit(total, weights);
          const sum = parts.reduce((acc, p) => acc + p, 0);
          expect(sum).toBe(total);
          expect(parts).toHaveLength(weights.length);
          for (const p of parts) {
            expect(Number.isInteger(p)).toBe(true);
            expect(p).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it("property: adversarial edge cases never lose or invent a cent", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.constant(1),
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 0, max: 100_000_000 }),
        ),
        fc.array(fc.integer({ min: 1, max: 1 }), { minLength: 1, maxLength: 100 }),
        (total, weights) => {
          const parts = largestRemainderSplit(total, weights);
          expect(parts.reduce((acc, p) => acc + p, 0)).toBe(total);
        },
      ),
      { numRuns: 200 },
    );
  });
});

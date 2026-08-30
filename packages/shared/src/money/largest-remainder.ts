/**
 * Splits an integer `total` (cents) across `weights` proportionally, using
 * largest-remainder rounding, with the invariant:
 *
 *   sum(largestRemainderSplit(total, weights)) === total
 *
 * ALWAYS, exactly, for any valid input. No cent may ever be lost or
 * invented. This is the single highest-risk correctness property in the
 * billing domain: it underlies every split-bill and multi-ticket allocation.
 */
export function largestRemainderSplit(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total)) {
    throw new Error(`largestRemainderSplit requires an integer total, received: ${total}`);
  }
  if (total < 0) {
    throw new Error(`largestRemainderSplit requires a non-negative total, received: ${total}`);
  }
  if (weights.length === 0) {
    throw new Error("largestRemainderSplit requires at least one weight");
  }
  for (const weight of weights) {
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new Error(
        `largestRemainderSplit requires every weight to be a positive integer, received: ${weight}`,
      );
    }
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Ideal (fractional) share per weight, and its integer floor.
  const floors: number[] = [];
  const remainders: number[] = [];
  let allocated = 0;

  for (const weight of weights) {
    const idealShare = (total * weight) / totalWeight;
    const floorShare = Math.floor(idealShare);
    floors.push(floorShare);
    remainders.push(idealShare - floorShare);
    allocated += floorShare;
  }

  let remainingCents = total - allocated;

  // Distribute the leftover cents one at a time to the entries with the
  // largest fractional remainder, breaking ties by original index for
  // deterministic behavior.
  const order = weights
    .map((_, index) => index)
    .sort((a, b) => (remainders[b] ?? 0) - (remainders[a] ?? 0) || a - b);

  const result = [...floors];
  for (let i = 0; i < order.length && remainingCents > 0; i += 1) {
    const index = order[i];
    if (index === undefined) {
      break;
    }
    result[index] = (result[index] ?? 0) + 1;
    remainingCents -= 1;
  }

  return result;
}

/**
 * Every mock adapter method runs through this helper so that, even though
 * the "backend" is in-memory, callers NEVER observe synchronous resolution.
 * This is deliberate: if a component ever picks up a synchronous
 * assumption from a mock port, swapping in the HTTP adapter at milestone 2
 * would break it. See design.md "The Milestone-1 -> Milestone-2 Swap".
 */
const MOCK_LATENCY_MS = 120;

export async function simulateLatency<T>(work: () => T): Promise<T> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return work();
}

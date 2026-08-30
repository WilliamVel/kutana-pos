/**
 * Test-only / demo-only control surface. Lets a test or a debug UI control
 * force the NEXT `save`/`recordMovement` call on the owning mock repository
 * to throw `ConflictError`, without needing a real second concurrent
 * writer. This is what powers the milestone-1 demo's 409/conflict banner
 * (see design.md "Realtime Design" - conflict surfacing) before any real
 * backend or second client exists.
 */
export class ConflictTrigger {
  #forced = false;

  /** Arms the trigger: the next write on the owning repository will throw ConflictError. */
  forceNextConflict(): void {
    this.#forced = true;
  }

  /** Consumes (and disarms) the trigger. Returns true exactly once per `forceNextConflict()` call. */
  consumeForcedConflict(): boolean {
    if (!this.#forced) {
      return false;
    }
    this.#forced = false;
    return true;
  }
}

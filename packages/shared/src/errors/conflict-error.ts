import { DomainError } from "./domain-error.js";

/**
 * Thrown by any repository `save(aggregate, expectedVersion)` method when
 * the stored aggregate's version no longer matches `expectedVersion` — i.e.
 * a concurrent writer has already advanced it. A stale write MUST NEVER
 * silently overwrite; the caller MUST receive the current stored snapshot
 * (`currentSnapshot`) so the UI can show it instead of losing the edit.
 */
export class ConflictError<TSnapshot = unknown> extends DomainError {
  constructor(
    message: string,
    public readonly currentSnapshot: TSnapshot,
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

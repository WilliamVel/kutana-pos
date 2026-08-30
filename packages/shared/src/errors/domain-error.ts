/**
 * Base class for all domain-level errors raised by `packages/shared`.
 * Kept framework-free: no HTTP status codes, no NestJS exception types.
 * Adapters translate these into transport-specific responses.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** A domain invariant was violated by the requested operation. */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

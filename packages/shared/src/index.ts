/**
 * @kutana/shared — pure domain package.
 *
 * This package MUST have zero runtime dependencies and MUST NOT import any
 * framework, I/O, or platform package (no @nestjs/*, no react, no pg, no fs).
 * Domain entities, value objects, services, and port interfaces are added
 * here in later phases (PR2+). Phase 1 only proves the package boundary
 * and the test runner wiring.
 */

export const SHARED_PACKAGE_NAME = "@kutana/shared" as const;

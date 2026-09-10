import type { AuthRole } from "./auth-session.js";

export interface ManagedAuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly deactivatedAt: string | null;
}

export interface CreateManagedAuthUserInput {
  readonly displayName: string;
  readonly role: AuthRole;
  readonly pin: string;
}

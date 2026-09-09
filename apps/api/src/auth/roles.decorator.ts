import type { AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import { SetMetadata } from "@nestjs/common";

export const REQUIRED_ROLES = Symbol("REQUIRED_ROLES");

export function RequireRole(...roles: readonly AuthRole[]): ReturnType<typeof SetMetadata> {
  return SetMetadata(REQUIRED_ROLES, roles);
}

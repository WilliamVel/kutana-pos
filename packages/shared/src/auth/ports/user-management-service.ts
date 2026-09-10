import type { CreateManagedAuthUserInput, ManagedAuthUser } from "../model/user-management.js";

export interface UserManagementService {
  readonly listUsers: () => Promise<readonly ManagedAuthUser[]>;
  readonly createUser: (input: CreateManagedAuthUserInput) => Promise<ManagedAuthUser>;
  readonly deactivateUser: (id: string) => Promise<ManagedAuthUser>;
}

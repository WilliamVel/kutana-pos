import { isValidPin } from "@kutana/shared/auth/model/auth-session.js";
import type { CreateManagedAuthUserInput, ManagedAuthUser } from "@kutana/shared/auth/model/user-management.js";
import type { UserManagementService } from "@kutana/shared/auth/ports/user-management-service.js";
import { simulateLatency } from "./simulate-latency.js";

const INITIAL_USERS: readonly ManagedAuthUser[] = [
  { id: "operator-mina", displayName: "Mina", role: "admin", deactivatedAt: null },
  { id: "operator-ollie", displayName: "Ollie", role: "operator", deactivatedAt: null },
];

export class MockUserManagementService implements UserManagementService {
  private readonly usersById = new Map<string, ManagedAuthUser>();
  private readonly onResetPin?: (userId: string, newPin: string) => Promise<void>;

  constructor(
    initialUsers: readonly ManagedAuthUser[] = INITIAL_USERS,
    onResetPin?: (userId: string, newPin: string) => Promise<void>,
  ) {
    for (const user of initialUsers) this.usersById.set(user.id, user);
    this.onResetPin = onResetPin;
  }

  async listUsers(): Promise<readonly ManagedAuthUser[]> {
    return simulateLatency(() =>
      [...this.usersById.values()].sort((left, right) =>
        left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id),
      ),
    );
  }

  async createUser(input: CreateManagedAuthUserInput): Promise<ManagedAuthUser> {
    return simulateLatency(() => {
      if (!isValidPin(input.pin)) throw new Error("PIN must be exactly 4 numeric digits");
      const user: ManagedAuthUser = {
        id: `user-${crypto.randomUUID()}`,
        displayName: input.displayName.trim(),
        role: input.role,
        deactivatedAt: null,
      };
      this.usersById.set(user.id, user);
      return user;
    });
  }

  async resetPin(input: { readonly userId: string; readonly newPin: string }): Promise<void> {
    return simulateLatency(async () => {
      if (!this.usersById.has(input.userId)) throw new Error("User not found");
      if (!isValidPin(input.newPin)) throw new Error("PIN must be exactly 4 numeric digits");
      await this.onResetPin?.(input.userId, input.newPin);
    });
  }

  async deactivateUser(id: string): Promise<ManagedAuthUser> {
    return simulateLatency(() => {
      const user = this.usersById.get(id);
      if (!user) throw new Error("User not found");
      const deactivated = { ...user, deactivatedAt: new Date().toISOString() };
      this.usersById.set(id, deactivated);
      return deactivated;
    });
  }
}

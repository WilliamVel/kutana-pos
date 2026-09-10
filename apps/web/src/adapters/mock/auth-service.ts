import type { AuthSession, LoginCredentials } from "@kutana/shared/auth/model/auth-session.js";
import { isValidPin } from "@kutana/shared/auth/model/auth-session.js";
import type { AuthService } from "@kutana/shared/auth/ports/auth-service.js";

const DEMO_OPERATORS = [
  {
    operatorId: "operator-mina",
    displayName: "Mina",
    role: "admin",
    pin: "1234",
  },
  {
    operatorId: "operator-ollie",
    displayName: "Ollie",
    role: "operator",
    pin: "2468",
  },
] as const;

export class MockAuthService implements AuthService {
  private session: AuthSession | null = null;
  private readonly pins = new Map<string, string>(DEMO_OPERATORS.map((operator) => [operator.operatorId, operator.pin]));

  currentSession(): AuthSession | null {
    return this.session;
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const operator = DEMO_OPERATORS.find(
      (candidate) =>
        credentials.operator.trim() === candidate.displayName && credentials.pin === this.pins.get(candidate.operatorId),
    );
    if (!operator) throw new Error("Invalid operator credentials");

    this.session = {
      operatorId: operator.operatorId,
      displayName: operator.displayName,
      role: operator.role,
      token: `mock-auth-token-${operator.operatorId}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      refreshToken: `mock-refresh-token-${operator.operatorId}`,
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    return this.session;
  }

  async changePin(input: { readonly currentPin: string; readonly newPin: string }): Promise<void> {
    if (!isValidPin(input.newPin) || !this.session || this.pins.get(this.session.operatorId) !== input.currentPin) {
      throw new Error("PIN inválido");
    }
    this.pins.set(this.session.operatorId, input.newPin);
  }

  async resetPin(userId: string, newPin: string): Promise<void> {
    if (!isValidPin(newPin) || !this.pins.has(userId)) throw new Error("PIN inválido");
    this.pins.set(userId, newPin);
  }

  async refresh(): Promise<AuthSession | null> {
    if (!this.session) return null;
    this.session = {
      ...this.session,
      token: `mock-auth-token-${this.session.operatorId}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      refreshToken: `mock-refresh-token-${this.session.operatorId}-${Date.now()}`,
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    return this.session;
  }

  logout(): void {
    this.session = null;
  }
}

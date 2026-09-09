import type { AuthSession, LoginCredentials } from "@kutana/shared/auth/model/auth-session.js";
import type { AuthService } from "@kutana/shared/auth/ports/auth-service.js";

const DEMO_OPERATOR = {
  operatorId: "operator-mina",
  displayName: "Mina",
  pin: "1234",
} as const;

export class MockAuthService implements AuthService {
  private session: AuthSession | null = null;

  currentSession(): AuthSession | null {
    return this.session;
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (
      credentials.operator.trim() !== DEMO_OPERATOR.displayName ||
      credentials.pin !== DEMO_OPERATOR.pin
    ) {
      throw new Error("Invalid operator credentials");
    }

    this.session = {
      operatorId: DEMO_OPERATOR.operatorId,
      displayName: DEMO_OPERATOR.displayName,
      token: "mock-auth-token-mina",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      refreshToken: "mock-refresh-token-mina",
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    return this.session;
  }

  async refresh(): Promise<AuthSession | null> {
    if (!this.session) return null;
    this.session = {
      ...this.session,
      token: `mock-auth-token-mina-${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      refreshToken: `mock-refresh-token-mina-${Date.now()}`,
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    return this.session;
  }

  logout(): void {
    this.session = null;
  }
}

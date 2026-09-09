export type AuthRole = "admin" | "operator";

export interface AuthSession {
  readonly operatorId: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly token: string;
  readonly expiresAt: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
}

export interface LoginCredentials {
  readonly operator: string;
  readonly pin: string;
}

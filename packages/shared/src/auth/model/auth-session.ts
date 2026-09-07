export interface AuthSession {
  readonly operatorId: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface LoginCredentials {
  readonly operator: string;
  readonly pin: string;
}

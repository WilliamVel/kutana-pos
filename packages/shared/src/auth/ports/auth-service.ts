import type { AuthSession, LoginCredentials } from "../model/auth-session.js";

export interface AuthService {
  readonly currentSession: () => AuthSession | null;
  readonly login: (credentials: LoginCredentials) => Promise<AuthSession>;
  readonly logout: () => void;
}

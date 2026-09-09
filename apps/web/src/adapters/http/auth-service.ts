import type { AuthSession, LoginCredentials } from "@kutana/shared/auth/model/auth-session.js";
import type { AuthService } from "@kutana/shared/auth/ports/auth-service.js";
import { HttpClient, type HttpClientOptions } from "./http-client.js";

export const AUTH_SESSION_EXPIRED_EVENT = "kutana.auth.session-expired";

export class HttpAuthService implements AuthService {
  private readonly http: HttpClient;
  private session: AuthSession | null = null;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
    this.session = options.getBearerToken ? null : readStoredSession();
    if (this.session) this.http.setBearerToken(this.session.token);
  }

  currentSession(): AuthSession | null {
    return this.session;
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const session = await this.http.request<AuthSession>("/auth/login", {
      method: "POST",
      body: credentials,
      auth: false,
    });
    this.setSession(session);
    return session;
  }

  async refresh(): Promise<AuthSession | null> {
    if (!this.session?.refreshToken) return null;

    try {
      const session = await this.http.request<AuthSession>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: this.session.refreshToken },
        auth: false,
      });
      this.setSession(session);
      return session;
    } catch {
      this.logout();
      notifySessionExpired();
      return null;
    }
  }

  logout(): void {
    this.session = null;
    this.http.setBearerToken(null);
    clearStoredSession();
  }

  private setSession(session: AuthSession): void {
    this.session = session;
    this.http.setBearerToken(session.token);
    storeSession(session);
  }
}

const STORAGE_KEY = "kutana.auth.session";

function readStoredSession(): AuthSession | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function storeSession(session: AuthSession): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

function clearStoredSession(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function notifySessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

export interface HttpClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly getBearerToken?: () => string | null;
  readonly refreshSession?: () => Promise<string | null>;
}

export interface HttpRequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | null | undefined>;
  readonly auth?: boolean;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly responseBody: string | null;

  constructor(input: {
    status: number;
    statusText: string;
    responseBody: string | null;
    url: string;
  }) {
    const details = input.responseBody?.trim() || input.statusText || "HTTP request failed";
    super(`HTTP ${input.status} ${details} for ${input.url}`);
    this.name = "HttpError";
    this.status = input.status;
    this.statusText = input.statusText;
    this.responseBody = input.responseBody;
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private bearerToken: string | null;
  private readonly getBearerToken?: () => string | null;
  private readonly refreshSession?: () => Promise<string | null>;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultApiBaseUrl());
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.bearerToken = null;
    this.getBearerToken = options.getBearerToken;
    this.refreshSession = options.refreshSession;
  }

  setBearerToken(token: string | null): void {
    this.bearerToken = token;
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const headers = new Headers();
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(options.body);
    }

    const token = this.getBearerToken?.() ?? this.bearerToken;
    if (options.auth !== false && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    console.info("[api] request", {
      method: init.method,
      url,
      authenticated: options.auth !== false,
      hasBearerToken: Boolean(token),
    });

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
      console.info("[api] response", { method: init.method, url, status: response.status });
    } catch (error) {
      console.error("[api] network error", { method: init.method, url, error });
      throw error;
    }

    if (response.status === 401 && options.auth !== false && this.refreshSession) {
      console.warn("[api] unauthorized, refreshing session", { url });
      const refreshedToken = await this.refreshSession();
      console.info("[api] refresh result", { url, refreshed: Boolean(refreshedToken) });
      if (refreshedToken) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await this.fetchImpl(url, init);
      }
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => null);
      throw new HttpError({
        status: response.status,
        statusText: response.statusText,
        responseBody,
        url,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (text.length === 0) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }
}

export function defaultApiBaseUrl(): string {
  const env = import.meta.env as { readonly VITE_API_BASE_URL?: string | undefined };
  if (env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL;
  }

  const location = globalThis.location;
  if (location?.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    return `${location.protocol}//${location.hostname}:3000`;
  }

  return "http://localhost:3000";
}

export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function buildUrl(baseUrl: string, path: string, query: HttpRequestOptions["query"] = {}): string {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

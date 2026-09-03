export interface HttpClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export interface HttpRequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | null | undefined>;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly responseBody: string | null;

  constructor(input: { status: number; statusText: string; responseBody: string | null; url: string }) {
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

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultApiBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch;
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

    const response = await this.fetchImpl(url, init);
    if (!response.ok) {
      throw new HttpError({
        status: response.status,
        statusText: response.statusText,
        responseBody: await response.text().catch(() => null),
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
  return env.VITE_API_BASE_URL ?? "http://localhost:3000";
}

export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: HttpRequestOptions["query"] = {},
): string {
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

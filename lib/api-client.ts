// In production, NEXT_PUBLIC_API_URL points to the HF Spaces backend directly.
// This avoids Vercel's edge rewrite proxy, which has strict timeouts that cause
// ROUTER_EXTERNAL_TARGET_ERROR when the backend is slow (cold start, latency).
// Falls back to relative URLs (Next.js rewrite proxy) if unset.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const body = await res.text();
      // Try to extract a JSON error detail; fall back to a clean message
      try {
        const json = JSON.parse(body);
        const detail = json.detail || json.message;
        if (detail) {
          // FastAPI validation errors return detail as an array of objects
          const msg = typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
              : JSON.stringify(detail);
          throw new Error(msg);
        }
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (e instanceof Error && e.message !== `HTTP ${res.status}`) throw e;
      }
      // If body is HTML (e.g. HF Spaces 500 page), show a user-friendly message
      if (body.includes("<!DOCTYPE") || body.includes("<html")) {
        throw new Error(
          res.status >= 500
            ? "Backend is starting up — please wait a moment and try again"
            : `Request failed (HTTP ${res.status})`
        );
      }
      throw new Error(body || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Fetch with retry for 5xx errors (handles HF Spaces cold starts).
   * Retries up to `retries` times with exponential backoff.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries = 2,
    backoffMs = 1500,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, init);
      if (res.status < 500 || attempt === retries) return res;
      // Wait before retrying (Space may be waking up)
      await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
    }
    // Unreachable, but TypeScript needs it
    return fetch(url, init);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") sp.set(k, v);
      });
      const qs = sp.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await this.fetchWithRetry(url, { headers: this.getHeaders() });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  /**
   * POST directly to the backend (bypasses Next.js rewrite proxy).
   * Use for long-running endpoints that exceed the proxy timeout.
   */
  async postDirect<T>(path: string, body?: unknown, timeoutMs = 600_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("Request timed out"), timeoutMs);
    try {
      const res = await fetch(`${this.backendUrl}${path}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      return this.handleResponse<T>(res);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s — try fewer tickers or skip layers`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return this.handleResponse<T>(res);
  }

  async del<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  private get backendUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";
  }

  /** Create an EventSource for SSE streaming */
  createSSE(path: string, params?: Record<string, string>): EventSource {
    const url = new URL(`${this.backendUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) url.searchParams.set("token", token);
    return new EventSource(url.toString());
  }

  /** Create a WebSocket connection */
  createWebSocket(path: string): WebSocket {
    const wsBase = this.backendUrl.replace(/^http/, "ws");
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = `${wsBase}${path}${token ? `?token=${token}` : ""}`;
    return new WebSocket(url);
  }

  get base() {
    return this.baseUrl;
  }
}

export const api = new ApiClient(API_BASE);

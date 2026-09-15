/**
 * lib/client.ts
 *
 * A thin wrapper around fetch for talking to this app's own API.
 *
 * Its job is to turn the API's error shape into a thrown Error carrying a
 * useful message. Without this, every component would have to check
 * response.ok, parse the body, and decide what to display — and would
 * probably end up showing "Failed to fetch" for a validation error that had
 * a perfectly good explanation in the response.
 */

type ApiError = { error: string; details?: string[] };

export class RequestError extends Error {
  status: number;
  details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.details = details;
  }

  /** The message plus any per-field detail, ready to show to the user. */
  get full(): string {
    return this.details.length > 0
      ? `${this.message}: ${this.details.join(", ")}`
      : this.message;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  // 204 and other empty responses have no body to parse.
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const err = body as ApiError | null;
    throw new RequestError(
      err?.error ?? `Request failed (${response.status})`,
      response.status,
      err?.details ?? []
    );
  }

  return (body?.data ?? body) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

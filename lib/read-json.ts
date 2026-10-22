/*
 * Client-side helpers for API responses. A gateway timeout or crash can return
 * an HTML/text page instead of JSON; calling res.json() on that throws
 * "Unexpected token <", which then ends up in front of the user. These read
 * the body defensively and turn failures into a readable message.
 */

type ApiBody = Record<string, unknown> & { error?: unknown; message?: unknown };

/** Parses a JSON body, or returns {} when the body isn't JSON. */
export async function readJson<T = ApiBody>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

function statusMessage(status: number): string | null {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "Not found.";
  if (status === 413) return "The request is too large.";
  if (status === 429) return "Too many requests. Please wait a moment and retry.";
  if (status === 502 || status === 503 || status === 504) {
    return "The server took too long or is temporarily unavailable. Please try again.";
  }
  return null;
}

/** Best user-facing error message for a failed response. */
export function apiErrorMessage(res: Response, body: { error?: unknown; message?: unknown }, fallback: string): string {
  if (typeof body.error === "string" && body.error) return body.error;
  if (typeof body.message === "string" && body.message) return body.message;
  return statusMessage(res.status) ?? fallback;
}

// Standard JSON helpers + typed error class.
import { corsHeaders } from "./cors.ts";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}

export function asResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return json({ error: e.message, ...(e.issues ? { issues: e.issues } : {}) }, e.status);
  }
  console.error("[api] unhandled error", e);
  return json({ error: (e as Error).message ?? "Internal error" }, 500);
}

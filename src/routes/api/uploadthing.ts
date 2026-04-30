// UploadThing adapter: GET/POST for presign + callbacks. Admin-only uploads enforced in router middleware.
import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";
import { API_CORS, preflight } from "@/server/auth.server";
import { uploadRouter } from "@/server/uploadthingRouter";
import { resolveUploadThingToken } from "@/server/uploadthingToken";

function mergeCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(API_CORS)) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

const token = resolveUploadThingToken();
const isDev = process.env.NODE_ENV === "development";

const handler = token
  ? createRouteHandler({
      router: uploadRouter,
      config: {
        token,
        isDev,
        fetch: (url, init) => {
          const next = init ? { ...init } : {};
          if ("cache" in next) delete (next as RequestInit & { cache?: unknown }).cache;
          return fetch(url, next);
        },
      },
    })
  : null;

export const Route = createFileRoute("/api/uploadthing")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request }) => {
        if (!handler) {
          return mergeCors(
            new Response(
              JSON.stringify({
                error:
                  "UploadThing is not configured. Set UPLOADTHING_TOKEN (from dashboard) or UPLOADTHING_SECRET + UPLOADTHING_APP_ID in .env.",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return mergeCors(await handler(request));
      },

      POST: async ({ request }) => {
        if (!handler) {
          return mergeCors(
            new Response(
              JSON.stringify({
                error:
                  "UploadThing is not configured. Set UPLOADTHING_TOKEN (from dashboard) or UPLOADTHING_SECRET + UPLOADTHING_APP_ID in .env.",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return mergeCors(await handler(request));
      },
    },
  },
});

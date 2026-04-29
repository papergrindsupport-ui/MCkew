// =====================================================================
// Backend API entrypoint — thin Express-style router.
// ----------------------------------------------------------------------
//   Frontend (React SPA)
//        │   fetch
//        ▼
//   Backend API  ◀──────── this file
//        │   service-role
//        ▼
//   Supabase (DB + Storage)
//
// Conventions:
//   • All routes return JSON `{ data }` on success, `{ error, issues? }`
//     on failure with a meaningful HTTP status code.
//   • Validation lives next to each route in routes/*.ts.
//   • Auth resolution is centralized in lib/auth.ts.
//   • Errors thrown as `HttpError(status, msg)` are mapped automatically.
// =====================================================================

import { corsHeaders } from "./lib/cors.ts";
import { json, HttpError, asResponse } from "./lib/http.ts";
import { resolveCaller } from "./lib/auth.ts";

import * as profiles from "./routes/profiles.ts";
import * as desk from "./routes/desk.ts";
import * as planner from "./routes/planner.ts";
import * as uploads from "./routes/uploads.ts";

type RouteMatch = {
  match: (path: string) => RegExpMatchArray | null;
  handlers: Partial<
    Record<
      "GET" | "POST" | "PATCH" | "DELETE",
      (
        req: Request,
        params: string[],
        caller: Awaited<ReturnType<typeof resolveCaller>>,
      ) => Promise<Response>
    >
  >;
};

const routes: RouteMatch[] = [
  // ---------- meta ------------------------------------------------
  {
    match: (p) => (p === "/" || p === "/health" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: {
      GET: async () => json({ ok: true, service: "api", time: new Date().toISOString() }),
    },
  },

  // ---------- profiles -------------------------------------------
  {
    match: (p) => (p === "/profiles" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: {
      GET: (req) => profiles.listProfiles(req),
      POST: (req, _p, caller) => profiles.createProfile(req, caller),
    },
  },
  {
    match: (p) => p.match(/^\/profiles\/([^/]+)$/),
    handlers: {
      GET: (_req, [id]) => profiles.getProfile(decodeURIComponent(id)),
      PATCH: (req, [id], caller) => profiles.patchProfile(req, decodeURIComponent(id), caller),
      DELETE: (_req, [id], caller) => profiles.deleteProfile(decodeURIComponent(id), caller),
    },
  },

  // ---------- desk -----------------------------------------------
  {
    match: (p) => (p === "/desk/folders" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: {
      GET: (_req, _p, caller) => desk.listFolders(caller),
      POST: (req, _p, caller) => desk.createFolder(req, caller),
    },
  },
  {
    match: (p) => p.match(/^\/desk\/folders\/([^/]+)$/),
    handlers: {
      PATCH: (req, [id], caller) => desk.patchFolder(req, id, caller),
      DELETE: (_req, [id], caller) => desk.deleteFolder(id, caller),
    },
  },
  {
    match: (p) => (p === "/desk/items" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: {
      GET: (req, _p, caller) => desk.listItems(req, caller),
      POST: (req, _p, caller) => desk.createItem(req, caller),
    },
  },
  {
    match: (p) => p.match(/^\/desk\/items\/([^/]+)$/),
    handlers: {
      PATCH: (req, [id], caller) => desk.patchItem(req, id, caller),
      DELETE: (_req, [id], caller) => desk.deleteItem(id, caller),
    },
  },

  // ---------- planner --------------------------------------------
  {
    match: (p) => (p === "/planner/tasks" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: {
      GET: (_req, _p, caller) => planner.listTasks(caller),
      POST: (req, _p, caller) => planner.createTask(req, caller),
    },
  },
  {
    match: (p) => p.match(/^\/planner\/tasks\/([^/]+)$/),
    handlers: {
      PATCH: (req, [id], caller) => planner.patchTask(req, id, caller),
      DELETE: (_req, [id], caller) => planner.deleteTask(id, caller),
    },
  },

  // ---------- uploads --------------------------------------------
  {
    match: (p) => (p === "/uploads/avatar" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: { POST: (req, _p, caller) => uploads.uploadAvatar(req, caller) },
  },
  {
    match: (p) => (p === "/uploads/question-image" ? ([] as unknown as RegExpMatchArray) : null),
    handlers: { POST: (req, _p, caller) => uploads.uploadQuestionImage(req, caller) },
  },
];

// ----------------------------------------------------------------------

Deno.serve(async (req) => {
  const started = performance.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";

  try {
    const caller = await resolveCaller(req);

    for (const route of routes) {
      const m = route.match(path);
      if (!m) continue;
      const handler = route.handlers[req.method as keyof typeof route.handlers];
      if (!handler) {
        return json({ error: `Method ${req.method} not allowed on ${path}` }, 405);
      }
      const params = (m as unknown as string[]).slice(1);
      const res = await handler(req, params, caller);
      const ms = Math.round(performance.now() - started);
      console.log(`[api] ${req.method} ${path} → ${res.status} (${ms}ms, caller=${caller.kind})`);
      return res;
    }

    throw new HttpError(404, `Route not found: ${req.method} ${path}`);
  } catch (e) {
    const res = asResponse(e);
    const ms = Math.round(performance.now() - started);
    console.log(`[api] ${req.method} ${path} → ${res.status} (${ms}ms, error)`);
    return res;
  }
});

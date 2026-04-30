// =====================================================================
// Frontend → Backend API client.
// ----------------------------------------------------------------------
// All backend traffic flows through here. Endpoints live in
// src/routes/api/*.ts (TanStack server routes). When a method below is
// unimplemented on the server, it throws an ApiError with status 501 so
// callers can fail loudly rather than hang.
//
// Auth strategy:
//   - If a Clerk session is active → `Authorization: Bearer <jwt>`.
//   - Else attach `x-account-public-id: <guest|anon publicId>` so the
//     backend can scope writes to that account.
// =====================================================================

const API_BASE = "/api";

export type ApiError = {
  error: string;
  issues?: Array<{ field: string; message: string }>;
  status: number;
};

export type GetClerkToken = () => Promise<string | null>;

export interface ApiClientOptions {
  getToken?: GetClerkToken;
  publicId?: string | null;
}

export function createApiClient(opts: ApiClientOptions = {}) {
  function timeoutSignal(ms: number): AbortSignal | undefined {
    // `AbortSignal.timeout` is not available in every runtime/browser.
    if (typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).timeout === "function") {
      return (AbortSignal as any).timeout(ms) as AbortSignal;
    }
    if (typeof AbortController !== "undefined" && typeof window !== "undefined") {
      const controller = new AbortController();
      window.setTimeout(() => controller.abort(), ms);
      return controller.signal;
    }
    return undefined;
  }

  function isApiError(value: unknown): value is ApiError {
    if (!value || typeof value !== "object") return false;
    return "error" in value && "status" in value;
  }

  async function buildHeaders(extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extra };
    const token = opts.getToken ? await opts.getToken() : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (opts.publicId) headers["x-account-public-id"] = opts.publicId;
    return headers;
  }

  function parseApiResponse(text: string, res: Response): Record<string, unknown> {
    const ct = res.headers.get("content-type") || "";
    const start = text.trimStart();
    if (
      start.startsWith("<!DOCTYPE") ||
      start.startsWith("<!doctype") ||
      start.startsWith("<html") ||
      ct.includes("text/html")
    ) {
      return {
        error:
          `Server returned HTML (${res.status}) instead of JSON — usually a crashed API handler, SPA ` +
          `fallback on the route, or missing server secrets in the deploy bundle (.env loaded at build via ` +
          `vite.config). Restart dev after setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`,
      };
    }
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: text.slice(0, 240) };
    }
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = await buildHeaders({ "Content-Type": "application/json" });

    // Retry logic for transient network errors
    const maxRetries = 2;
    let lastError: Error | null = null;
    let lastApiError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          // Keep requests resilient on slower backends/networks.
          signal: timeoutSignal(30000),
        });
        const text = await res.text();
        const data = parseApiResponse(text, res);
        if (!res.ok) {
          const errRaw = data.error;
          const errMsg =
            typeof errRaw === "string" ? errRaw : errRaw != null ? String(errRaw) : res.statusText;
          throw {
            error: errMsg,
            issues: data.issues as ApiError["issues"],
            status: res.status,
          } satisfies ApiError;
        }
        return data as T;
      } catch (e: any) {
        if (isApiError(e)) {
          lastApiError = e;
        }
        // Don't retry on client errors (4xx)
        if (e.status >= 400 && e.status < 500) {
          throw e;
        }
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt >= maxRetries && lastApiError) {
          throw lastApiError;
        }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1))); // Exponential backoff
        }
      }
    }

    if (lastApiError) throw lastApiError;

    // Return a user-friendly error instead of exposing internal details
    throw {
      error: "Connection issue. Please try again.",
      status: lastError?.message?.includes("fetch") ? 503 : 500,
    } satisfies ApiError;
  }

  function notImplemented(name: string): Promise<any> {
    return Promise.reject({
      error: `API method not implemented yet: ${name}`,
      status: 501,
    } satisfies ApiError);
  }

  return {
    // ---------- Account ----------
    resolveAccount: (guestId?: string | null) =>
      request<{ profile: Record<string, unknown> | null }>("POST", "/account/resolve", { guestId }),

    // ---------- Profiles ----------
    getMyProfile: () => request<{ profile: Record<string, unknown> }>("GET", "/profile"),
    updateMyProfile: (patch: Record<string, unknown>) =>
      request<{ profile: Record<string, unknown> }>("PATCH", "/profile", patch),

    // Legacy aliases used by older code paths
    updateProfile: async (_publicId: string, patch: Record<string, unknown>) => {
      const r = await request<{ profile: Record<string, unknown> }>("PATCH", "/profile", patch);
      return { data: r.profile };
    },
    getProfile: (_publicId: string) =>
      Promise.reject<{ data: Record<string, unknown> }>({
        error: "getProfile by publicId not implemented yet",
        status: 501,
      } as ApiError),
    listProfiles: (_q?: string, _limit = 20) =>
      Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    createProfile: (_body: Record<string, unknown>) => notImplemented("createProfile"),
    deleteProfile: (_publicId: string) => notImplemented("deleteProfile"),

    // ---------- Streaks ----------
    getStreaks: () =>
      request<{
        state: {
          current: number;
          points: number;
          last_ts: number;
          current_subjects: Record<string, number>;
        } | null;
        history: Array<{
          day: string;
          points: number;
          pencils: number;
          ended_at: number;
          subject: string;
        }>;
      }>("GET", "/streaks"),
    putStreaks: (body: {
      state: {
        current: number;
        points: number;
        last_ts: number;
        current_subjects: Record<string, number>;
      };
      newHistory?: Array<{
        day: string;
        points: number;
        pencils: number;
        ended_at: number;
        subject: string;
      }>;
    }) => request<{ ok: true }>("PUT", "/streaks", body),

    // ---------- Daily goals ----------
    getDailyGoals: () =>
      request<{
        settings: {
          questions_goal: number;
          papers_goal: number;
          onboarded: boolean;
          celebrated_questions: Record<string, true>;
          celebrated_papers: Record<string, true>;
        } | null;
        history: Array<{
          day: string;
          questions_goal: number;
          papers_goal: number;
          correct_questions: number;
          passed_papers: number;
        }>;
      }>("GET", "/daily-goals"),
    putDailyGoals: (body: {
      settings?: Partial<{
        questions_goal: number;
        papers_goal: number;
        onboarded: boolean;
        celebrated_questions: Record<string, true>;
        celebrated_papers: Record<string, true>;
      }>;
      history?: Array<{
        day: string;
        questions_goal: number;
        papers_goal: number;
        correct_questions: number;
        passed_papers: number;
      }>;
    }) => request<{ ok: true }>("PUT", "/daily-goals", body),

    // ---------- Wallet (pencils) ----------
    getWallet: () =>
      request<{
        wallet: { total: number; credited_keys: Record<string, true> } | null;
        awards: Array<{
          id: string;
          ts: number;
          amount: number;
          reason: Record<string, unknown>;
        }>;
      }>("GET", "/wallet"),
    putWallet: (body: {
      total: number;
      newAwards?: Array<{
        ts: number;
        amount: number;
        reason: Record<string, unknown>;
        key: string;
      }>;
    }) => request<{ ok: true; total: number; accepted: number }>("PUT", "/wallet", body),

    // ---------- Desk (single JSONB doc) ----------
    getDesk: () =>
      request<{ desk: { data: Record<string, unknown>; updated_at: string } | null }>(
        "GET",
        "/desk",
      ),
    putDesk: (data: { folders: unknown[]; items: unknown[]; pinnedPapers: string[] }) =>
      request<{ ok: true }>("PUT", "/desk", { data }),

    // ---------- Analytics (single JSONB doc) ----------
    getAnalytics: () =>
      request<{ analytics: { data: Record<string, unknown>; updated_at: string } | null }>(
        "GET",
        "/analytics",
      ),
    putAnalytics: (data: {
      attempts: unknown[];
      papers: unknown[];
      attemptedPapers: Record<string, true>;
      recordedQuestions: Record<string, true>;
    }) => request<{ ok: true }>("PUT", "/analytics", { data }),

    // ---------- Daily challenge (single JSONB doc) ----------
    getDailyChallenge: () =>
      request<{ challenge: { data: Record<string, unknown>; updated_at: string } | null }>(
        "GET",
        "/daily-challenge",
      ),
    putDailyChallenge: (data: {
      pickedToday: Record<string, unknown>;
      history: Record<string, unknown>;
      usedQuestionIds: Record<string, unknown>;
    }) => request<{ ok: true }>("PUT", "/daily-challenge", { data }),

    // ---------- Legacy desk granular methods (not yet migrated) ----------
    listFolders: () => notImplemented("listFolders"),
    createFolder: (_body: Record<string, unknown>) => notImplemented("createFolder"),
    updateFolder: (_id: string, _patch: Record<string, unknown>) => notImplemented("updateFolder"),
    deleteFolder: (_id: string) => notImplemented("deleteFolder"),
    listItems: (_folderId?: string | null) => notImplemented("listItems"),
    createItem: (_body: Record<string, unknown>) => notImplemented("createItem"),
    updateItem: (_id: string, _patch: Record<string, unknown>) => notImplemented("updateItem"),
    deleteItem: (_id: string) => notImplemented("deleteItem"),

    // ---------- Planner tasks ----------
    listTasks: () => request<{ data: Array<Record<string, unknown>> }>("GET", "/planner-tasks"),
    createTask: (body: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("POST", "/planner-tasks", body),
    updateTask: (id: string, patch: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("PATCH", `/planner-tasks/${id}`, patch),
    deleteTask: (id: string) => request<{ ok: true }>("DELETE", `/planner-tasks/${id}`),

    // ---------- Leaderboard ----------
    getLeaderboard: () =>
      request<{
        data: Array<{
          id: string;
          profileUuid: string;
          clerkUserId: string | null;
          username: string | null;
          displayName: string | null;
          imageUrl: string | null;
          bio: string | null;
          accountType: string;
          pencils: number;
          followerCount: number;
          viewerFollows: boolean;
          isMe: boolean;
        }>;
      }>("GET", "/leaderboard"),

    // ---------- Public profile lookup ----------
    getPublicProfile: (username: string) =>
      request<{
        profile: {
          id: string;
          public_id: string;
          clerk_user_id: string | null;
          username: string | null;
          display_name: string | null;
          email: string | null;
          phone: string | null;
          image_url: string | null;
          bio: string | null;
          account_type: string;
          created_at: string;
          pencils: number;
          followerCount: number;
          followingCount: number;
          viewerFollows: boolean;
          isMe: boolean;
        };
      }>("GET", `/public-profile/${encodeURIComponent(username)}`),

    // ---------- Follows ----------
    followUser: (followee_public_id: string) =>
      request<{ ok: true; following: true }>("POST", "/follow", { followee_public_id }),
    unfollowUser: (followee_public_id: string) =>
      request<{ ok: true; following: false }>("DELETE", "/follow", { followee_public_id }),
    listFollowers: (publicId: string) =>
      request<{
        data: Array<{
          id: string;
          username: string | null;
          displayName: string | null;
          imageUrl: string | null;
          bio: string | null;
          accountType: string;
        }>;
      }>("GET", `/follows/${encodeURIComponent(publicId)}/list?dir=followers`),
    listFollowing: (publicId: string) =>
      request<{
        data: Array<{
          id: string;
          username: string | null;
          displayName: string | null;
          imageUrl: string | null;
          bio: string | null;
          accountType: string;
        }>;
      }>("GET", `/follows/${encodeURIComponent(publicId)}/list?dir=following`),

    // ---------- Gifts ----------
    sendGift: (body: { recipient_public_id: string; gift_id: string; note?: string | null }) =>
      request<{
        ok: true;
        giftId: string;
        amount: number;
        recipient: {
          publicId: string;
          username: string | null;
          displayName: string | null;
          imageUrl: string | null;
        };
      }>("POST", "/gifts", body),
    listGifts: (dir: "received" | "sent" = "received") =>
      request<{
        data: Array<{
          id: string;
          amount: number;
          message: string | null;
          createdAt: string;
          counterparty: {
            publicId: string;
            username: string | null;
            displayName: string | null;
            imageUrl: string | null;
            accountType: string;
          } | null;
        }>;
        totalAmount: number;
        totalCount: number;
      }>("GET", `/gifts?dir=${dir}`),

    // ---------- Admin: bootstrap + seed (idempotent) ----------
    initAdminAndSeed: () =>
      request<{
        becameAdmin: boolean;
        alreadyAdmin: boolean;
        seeded: boolean;
        stats: { papers: number; questions: number; answerKeys: number; thresholds: number };
      }>("POST", "/admin/init"),

    // ---------- Papers: bulk overrides for client merge ----------
    getPapersOverrides: () =>
      request<{
        papers: Array<Record<string, unknown> & { id: string }>;
        questionsByPaper: Record<string, Array<Record<string, unknown>>>;
        answerKeys: Record<string, string>;
        thresholds: Record<string, { letter: unknown; number: unknown }>;
      }>("GET", "/papers-overrides"),

    // ---------- Papers: admin write ----------
    upsertPaper: (body: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("POST", "/papers", body),
    putPaperQuestions: (paperId: string, questions: unknown[]) =>
      request<{ data: unknown[] }>("PUT", `/papers/${encodeURIComponent(paperId)}/questions`, {
        questions,
      }),
    putPaperAnswerKey: (paperId: string, letters: string) =>
      request<{ ok: true }>("PUT", `/papers/${encodeURIComponent(paperId)}/answer-key`, {
        letters,
      }),
    putPaperThresholds: (paperId: string, t: { letter?: unknown; number?: unknown }) =>
      request<{ ok: true }>("PUT", `/papers/${encodeURIComponent(paperId)}/thresholds`, t),
    deletePaper: (paperId: string) =>
      request<{ ok: true }>("DELETE", `/papers/${encodeURIComponent(paperId)}`),

    // ---------- Uploads (avatars: not yet on TanStack API; question images: UploadThing from admin UI) ----------
    uploadAvatar: (_file: File) => notImplemented("uploadAvatar"),

    // ---------- Volunteer applications ----------
    listVolunteerApplications: () =>
      request<{ data: Array<Record<string, unknown>> }>("GET", "/volunteer-applications"),
    submitVolunteerApplication: (body: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("POST", "/volunteer-applications", body),

    // ---------- Feedback wall (sticky notes) ----------
    listFeedbackNotes: () =>
      request<{ data: Array<Record<string, unknown>> }>("GET", "/feedback-notes"),
    postFeedbackNote: (body: Record<string, unknown>) =>
      request<{ data: Record<string, unknown> }>("POST", "/feedback-notes", body),
    reactFeedbackNote: (
      id: string,
      body: { device_id: string; action: "like" | "unlike" | "dislike" | "undislike" | "report" },
    ) =>
      request<{ data: Record<string, unknown> }>(
        "PATCH",
        `/feedback-notes/${encodeURIComponent(id)}`,
        body,
      ),
    deleteFeedbackNote: (id: string, body: { device_id: string }) =>
      request<{ ok: true }>("DELETE", `/feedback-notes/${encodeURIComponent(id)}`, body),

    // ---------- Contact / general feedback form ----------
    submitFeedback: (body: {
      name?: string;
      email?: string;
      category?: string;
      message: string;
      metadata?: Record<string, unknown>;
    }) => request<{ data: Record<string, unknown> }>("POST", "/feedback", body),
    listMyFeedback: () =>
      request<{
        data: Array<{
          id: string;
          name: string | null;
          email: string | null;
          category: string;
          message: string;
          metadata: Record<string, unknown>;
          status: string;
          created_at: string;
        }>;
      }>("GET", "/feedback"),

    // ---------- Email (server-side via Resend; 501 until secret set) ----------
    sendEmail: (body: {
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      from?: string;
      reply_to?: string;
    }) => request<{ ok: true; id: string | null }>("POST", "/send-email", body),

    // ---------- Health ----------
    health: () => Promise.resolve({ ok: true }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

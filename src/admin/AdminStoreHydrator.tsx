// AdminStoreHydrator
// ----------------------------------------------------------------------
// 1. Wires the admin store (admin/store.ts) up with a Clerk-aware API
//    client so publish/unpublish actions hit the backend.
// 2. Loads the bulk papers/questions/answer-keys/thresholds overrides from
//    the backend and feeds them into admin/merge.ts so smart-solve pages
//    show admin edits without each page making its own request.
// Mounted once at the root, after AccountProvider/CloudSyncProvider.

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient } from "@/lib/apiClient";
import { getClerkJwtForApi } from "@/lib/getClerkApiJwt";
import { useAccountStore } from "@/stores/useAccountStore";
import { _setAdminApi } from "@/admin/store";
import { _setRemoteOverrides } from "@/admin/merge";
import type { OptionLetter, Question } from "@/data/questionData";
import type { Paper } from "@/data/paperData";

function dbPaperRowToPartial(row: Record<string, unknown>): Partial<Paper> & { id: string } {
  const r = row as any;
  return {
    id: r.id,
    subject: r.subject,
    year: r.year,
    session: r.session,
    variant: r.variant,
    title: r.title,
    locked: r.locked,
    difficulty: r.difficulty ?? undefined,
    priority: r.priority ?? undefined,
    gradeThresholds: r.grade_thresholds ?? [],
    tags: r.tags ?? [],
    topics: r.topics ?? [],
    lessons: r.lessons ?? [],
    skills: r.skills ?? [],
    bentoSize: r.bento_size ?? "md",
    qpLink: r.qp_link ?? undefined,
    msLink: r.ms_link ?? undefined,
    gtLink: r.gt_link ?? undefined,
  } as Partial<Paper> & { id: string };
}

export function AdminStoreHydrator() {
  const profile = useAccountStore((s) => s.profile);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const api = createApiClient({
      getToken: isSignedIn ? () => getClerkJwtForApi(getToken) : undefined,
      publicId: !isSignedIn ? (profile?.public_id ?? null) : null,
    });
    _setAdminApi(api);

    let cancelled = false;
    (async () => {
      try {
        const r = await api.getPapersOverrides();
        if (cancelled) return;
        const papers: Record<string, Partial<Paper> & { id: string }> = {};
        for (const row of r.papers) papers[row.id as string] = dbPaperRowToPartial(row);
        const questionsByPaper: Record<string, Question[]> = {};
        for (const [pid, qs] of Object.entries(r.questionsByPaper ?? {})) {
          questionsByPaper[pid] = qs as unknown as Question[];
        }
        const answerKeys: Record<string, OptionLetter[]> = {};
        for (const [pid, letters] of Object.entries(r.answerKeys ?? {})) {
          const parsed = String(letters)
            .split("")
            .filter((l): l is OptionLetter => l === "A" || l === "B" || l === "C" || l === "D")
            .slice(0, 40);
          if (parsed.length === 40) answerKeys[pid] = parsed;
        }
        _setRemoteOverrides({ papers, questionsByPaper, answerKeys });
      } catch (e) {
        // Non-fatal: the static catalog still works.
        // eslint-disable-next-line no-console
        console.warn("[admin] overrides hydration skipped:", (e as { error?: string })?.error || e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.public_id, isSignedIn, getToken]);

  return null;
}

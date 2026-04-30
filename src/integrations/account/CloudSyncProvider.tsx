// CloudSyncProvider — hydrates and persists gamification stores to the
// backend whenever a profile is active.
//
// Strategy:
//   - On profile change, GET /api/{streaks,daily-goals,wallet,desk} and
//     hydrate the corresponding Zustand stores (without echoing back).
//   - Subscribe to each store; debounce-write changes back to the server.
//
// This lets the existing zustand+localStorage stores keep working
// unchanged while gaining persistence across devices/sessions.

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAccountStore } from "@/stores/useAccountStore";
import { useStreakStore } from "@/stores/useStreakStore";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";
import { usePencilsStore } from "@/stores/usePencilsStore";
import { useDeskStore } from "@/stores/useDeskStore";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useDailyChallengeStore } from "@/stores/useDailyChallengeStore";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useUpdateMyProfile } from "@/integrations/account/AccountProvider";
import { createApiClient, type ApiClient } from "@/lib/apiClient";
import { getClerkJwtForApi } from "@/lib/getClerkApiJwt";

function useApiClient(): () => ApiClient {
  const { getToken, isSignedIn } = useAuth();
  const profile = useAccountStore((s) => s.profile);
  return () =>
    createApiClient({
      getToken: isSignedIn ? () => getClerkJwtForApi(getToken) : undefined,
      publicId: !isSignedIn ? (profile?.public_id ?? null) : null,
    });
}

function debounce<F extends (...a: any[]) => void>(
  fn: F,
  ms: number,
): F & { flush: () => void; cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  const wrapped = ((...args: any[]) => {
    lastArgs = args;
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, ms);
  }) as any;
  wrapped.flush = () => {
    if (t) clearTimeout(t);
    t = null;
    if (lastArgs) fn(...lastArgs);
    lastArgs = null;
  };
  wrapped.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
    lastArgs = null;
  };
  return wrapped;
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const buildApi = useApiClient();
  const profile = useAccountStore((s) => s.profile);
  const profileId = profile?.id ?? null;
  const hydratingRef = useRef(false);
  const lastProfileIdRef = useRef<string | null>(null);
  const updateMyProfile = useUpdateMyProfile();

  // Hydrate from server when profile becomes available / changes.
  useEffect(() => {
    if (!profileId || profileId === lastProfileIdRef.current) return;
    lastProfileIdRef.current = profileId;
    hydratingRef.current = true;
    const api = buildApi();

    (async () => {
      try {
        const [streaksRes, goalsRes, walletRes, deskRes, analyticsRes, challengeRes] =
          await Promise.allSettled([
            api.getStreaks(),
            api.getDailyGoals(),
            api.getWallet(),
            api.getDesk(),
            api.getAnalytics(),
            api.getDailyChallenge(),
          ]);

        // Streaks
        if (streaksRes.status === "fulfilled" && streaksRes.value.state) {
          const s = streaksRes.value.state;
          useStreakStore.setState({
            current: s.current,
            points: s.points,
            lastTs: s.last_ts,
            currentSubjects: s.current_subjects as never,
            history: streaksRes.value.history.map((h) => ({
              day: h.day,
              points: h.points,
              pencils: h.pencils,
              endedAt: h.ended_at,
              subject: h.subject as never,
            })),
          });
        }

        // Daily goals
        if (goalsRes.status === "fulfilled" && goalsRes.value.settings) {
          const g = goalsRes.value.settings;
          const history: Record<string, any> = {};
          for (const h of goalsRes.value.history) {
            history[h.day] = {
              day: h.day,
              questionsGoal: h.questions_goal,
              papersGoal: h.papers_goal,
              correctQuestions: h.correct_questions,
              passedPapers: h.passed_papers,
            };
          }
          useDailyGoalsStore.setState({
            questionsGoal: g.questions_goal,
            papersGoal: g.papers_goal,
            onboarded: g.onboarded,
            celebratedQuestions: g.celebrated_questions,
            celebratedPapers: g.celebrated_papers,
            history,
          });
        }

        // Wallet
        if (walletRes.status === "fulfilled" && walletRes.value.wallet) {
          const w = walletRes.value.wallet;
          usePencilsStore.setState({
            total: w.total,
            creditedKeys: w.credited_keys,
            awards: walletRes.value.awards.map((a) => ({
              id: a.id,
              ts: a.ts,
              amount: a.amount,
              reason: a.reason as never,
            })),
          });
        }

        // Desk (full doc)
        if (deskRes.status === "fulfilled" && deskRes.value.desk?.data) {
          const data = deskRes.value.desk.data as any;
          if (Array.isArray(data.folders) && Array.isArray(data.items)) {
            useDeskStore.setState({
              folders: data.folders,
              items: data.items,
              pinnedPapers: Array.isArray(data.pinnedPapers) ? data.pinnedPapers : [],
            });
          }
        }

        // Analytics (full doc)
        if (analyticsRes.status === "fulfilled" && analyticsRes.value.analytics?.data) {
          const data = analyticsRes.value.analytics.data as any;
          useAnalyticsStore.setState({
            attempts: Array.isArray(data.attempts) ? data.attempts : [],
            papers: Array.isArray(data.papers) ? data.papers : [],
            attemptedPapers:
              data.attemptedPapers && typeof data.attemptedPapers === "object"
                ? data.attemptedPapers
                : {},
            recordedQuestions:
              data.recordedQuestions && typeof data.recordedQuestions === "object"
                ? data.recordedQuestions
                : {},
          });
        }

        // Daily challenge (full doc)
        if (challengeRes.status === "fulfilled" && challengeRes.value.challenge?.data) {
          const data = challengeRes.value.challenge.data as any;
          useDailyChallengeStore.setState({
            pickedToday: data.pickedToday ?? {},
            history: data.history ?? {},
            usedQuestionIds: data.usedQuestionIds ?? {},
          });
        }

        // App settings (from profile.preferences)
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
        const appSettings = (prefs.appSettings ?? {}) as Record<string, unknown>;
        if (appSettings && Object.keys(appSettings).length > 0) {
          useAppSettingsStore.setState((cur) => ({
            ...cur,
            ...appSettings,
          }));
        }
      } catch (e) {
        console.error("[cloud-sync] hydrate failed:", e);
      } finally {
        hydratingRef.current = false;
      }
    })();
  }, [profileId, buildApi]);

  // Subscribe to stores → debounce-push to server
  useEffect(() => {
    if (!profileId) return;

    const pushStreaks = debounce(async (state: ReturnType<typeof useStreakStore.getState>) => {
      try {
        await buildApi().putStreaks({
          state: {
            current: state.current,
            points: state.points,
            last_ts: state.lastTs,
            current_subjects: state.currentSubjects as Record<string, number>,
          },
          // We send the latest history record only (cheap dedupe)
          newHistory: state.history.slice(-1).map((h) => ({
            day: h.day,
            points: h.points,
            pencils: h.pencils,
            ended_at: h.endedAt,
            subject: h.subject,
          })),
        });
      } catch (e) {
        console.error("[cloud-sync] streaks push failed:", e);
      }
    }, 800);

    const pushGoals = debounce(async (state: ReturnType<typeof useDailyGoalsStore.getState>) => {
      try {
        await buildApi().putDailyGoals({
          settings: {
            questions_goal: state.questionsGoal,
            papers_goal: state.papersGoal,
            onboarded: state.onboarded,
            celebrated_questions: state.celebratedQuestions,
            celebrated_papers: state.celebratedPapers,
          },
          history: Object.values(state.history)
            .slice(-31)
            .map((h: any) => ({
              day: h.day,
              questions_goal: h.questionsGoal,
              papers_goal: h.papersGoal,
              correct_questions: h.correctQuestions,
              passed_papers: h.passedPapers,
            })),
        });
      } catch (e) {
        console.error("[cloud-sync] goals push failed:", e);
      }
    }, 800);

    const pushWallet = debounce(async (state: ReturnType<typeof usePencilsStore.getState>) => {
      try {
        await buildApi().putWallet({
          total: state.total,
          newAwards: state.awards.slice(-5).map((a) => ({
            ts: a.ts,
            amount: a.amount,
            reason: a.reason as Record<string, unknown>,
            key: `${a.reason.kind}:${(a.reason as any).questionId ?? (a.reason as any).paperId ?? a.id}`,
          })),
        });
      } catch (e) {
        console.error("[cloud-sync] wallet push failed:", e);
      }
    }, 800);

    const pushDesk = debounce(async (state: ReturnType<typeof useDeskStore.getState>) => {
      try {
        await buildApi().putDesk({
          folders: state.folders,
          items: state.items,
          pinnedPapers: state.pinnedPapers,
        });
      } catch (e) {
        console.error("[cloud-sync] desk push failed:", e);
      }
    }, 1200);

    const pushAnalytics = debounce(async (state: ReturnType<typeof useAnalyticsStore.getState>) => {
      try {
        await buildApi().putAnalytics({
          attempts: state.attempts.slice(-5000),
          papers: state.papers.slice(-2000),
          attemptedPapers: state.attemptedPapers,
          recordedQuestions: state.recordedQuestions,
        });
      } catch (e) {
        console.error("[cloud-sync] analytics push failed:", e);
      }
    }, 1500);

    const pushChallenge = debounce(
      async (state: ReturnType<typeof useDailyChallengeStore.getState>) => {
        try {
          await buildApi().putDailyChallenge({
            pickedToday: state.pickedToday as Record<string, unknown>,
            history: state.history as Record<string, unknown>,
            usedQuestionIds: state.usedQuestionIds as Record<string, unknown>,
          });
        } catch (e) {
          console.error("[cloud-sync] challenge push failed:", e);
        }
      },
      1200,
    );

    const pushSettings = debounce(
      async (state: ReturnType<typeof useAppSettingsStore.getState>) => {
        try {
          const appSettings = {
            pageTransitionsEnabled: state.pageTransitionsEnabled,
            loadingGameEnabled: state.loadingGameEnabled,
            loadingGame: state.loadingGame,
            gifReactionsEnabled: state.gifReactionsEnabled,
            showTextPopover: state.showTextPopover,
          };
          const currentPrefs = (useAccountStore.getState().profile?.preferences ?? {}) as Record<
            string,
            unknown
          >;
          await updateMyProfile({
            preferences: { ...currentPrefs, appSettings },
          } as never);
        } catch (e) {
          console.error("[cloud-sync] settings push failed:", e);
        }
      },
      800,
    );

    const unsub1 = useStreakStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushStreaks(s);
    });
    const unsub2 = useDailyGoalsStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushGoals(s);
    });
    const unsub3 = usePencilsStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushWallet(s);
    });
    const unsub4 = useDeskStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushDesk(s);
    });
    const unsub5 = useAnalyticsStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushAnalytics(s);
    });
    const unsub6 = useDailyChallengeStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushChallenge(s);
    });
    const unsub7 = useAppSettingsStore.subscribe((s) => {
      if (hydratingRef.current) return;
      pushSettings(s);
    });

    return () => {
      pushStreaks.flush();
      pushGoals.flush();
      pushWallet.flush();
      pushDesk.flush();
      pushAnalytics.flush();
      pushChallenge.flush();
      pushSettings.flush();
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
    };
  }, [profileId, buildApi, updateMyProfile]);

  return <>{children}</>;
}

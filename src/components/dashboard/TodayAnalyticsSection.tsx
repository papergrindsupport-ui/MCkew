// Today's Analytics — dashboard section replacing the old Streak Timelines.
// Shows today's attempted / correct / wrong counts and a compact timeline of
// today's events. Respects the "only count answered" rule because the
// analytics store never records unattempted questions.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LuActivity, LuCheck, LuX, LuTarget, LuClock } from "react-icons/lu";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { getPaperById, SUBJECT_LABEL } from "@/data/paperData";

function isToday(ts: number) {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function TodayAnalyticsSection() {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);

  const { attempted, correct, wrong, timeline } = useMemo(() => {
    const todayAtt = attempts.filter((a) => isToday(a.ts));
    const todayPap = papers.filter((p) => isToday(p.ts));
    type TLQ = { kind: "q"; ts: number; questionId: string; paperId: string; isCorrect: boolean };
    type TLP = {
      kind: "paper";
      ts: number;
      paperId: string;
      subKind: "attempt" | "submit";
      marks?: number;
      total?: number;
    };
    const events: (TLQ | TLP)[] = [
      ...todayAtt.map(
        (a): TLQ => ({
          kind: "q",
          ts: a.ts,
          questionId: a.questionId,
          paperId: a.paperId,
          isCorrect: a.isCorrect,
        }),
      ),
      ...todayPap.map(
        (p): TLP => ({
          kind: "paper",
          ts: p.ts,
          paperId: p.paperId,
          subKind: p.kind,
          marks: p.marks,
          total: p.total,
        }),
      ),
    ].sort((a, b) => b.ts - a.ts);
    return {
      attempted: todayAtt.length,
      correct: todayAtt.filter((a) => a.isCorrect).length,
      wrong: todayAtt.filter((a) => !a.isCorrect).length,
      timeline: events.slice(0, 40),
    };
  }, [attempts, papers]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/60 bg-card p-5 sm:p-6 space-y-4"
    >
      <header className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <LuActivity size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold">Today's Analytics</h2>
          <p className="text-xs text-muted-foreground">Your activity so far today.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Attempted" value={attempted} icon={<LuTarget size={12} />} />
        <Stat label="Correct" value={correct} icon={<LuCheck size={12} />} tone="emerald" />
        <Stat label="Wrong" value={wrong} icon={<LuX size={12} />} tone="red" />
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          <LuClock size={12} /> Today's timeline
        </div>
        {timeline.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border/60 rounded-xl">
            Nothing yet today — answer a question to see it here.
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {timeline.map((e, i) => {
              const date = new Date(e.ts).toLocaleTimeString();
              if (e.kind === "paper") {
                const meta = getPaperById(e.paperId);
                return (
                  <li
                    key={`p-${i}`}
                    className="rounded-xl border-2 border-border/60 bg-background px-3 py-2 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">
                        {e.subKind === "submit" ? "Submitted" : "Attempted"}:{" "}
                        {meta?.title ?? e.paperId}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {date}
                        {e.subKind === "submit" && e.marks !== undefined
                          ? ` · ${e.marks}/${e.total}`
                          : ""}
                        {meta?.subject ? ` · ${SUBJECT_LABEL[meta.subject]}` : ""}
                      </div>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={`q-${i}`}
                  className="rounded-xl border-2 border-border/60 bg-background px-3 py-2 flex items-center gap-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      e.isCorrect ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">
                      Question {e.questionId}{" "}
                      <span
                        className={
                          e.isCorrect
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {e.isCorrect ? "correct" : "wrong"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {date} · paper {e.paperId}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: "primary" | "emerald" | "red";
}) {
  const cls = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    red: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className={`rounded-2xl border-2 p-3 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 text-foreground tabular-nums">{value}</div>
    </div>
  );
}

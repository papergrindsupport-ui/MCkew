import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LuTarget, LuSettings, LuCheck, LuX } from "react-icons/lu";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useDailyGoalsStore, isPaperPassForGoal, dayKeyFor } from "@/stores/useDailyGoalsStore";
import { EditGoalsModal } from "./EditGoalsModal";

export function GoalsHistorySection() {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);
  const history = useDailyGoalsStore((s) => s.history);
  const questionsGoal = useDailyGoalsStore((s) => s.questionsGoal);
  const papersGoal = useDailyGoalsStore((s) => s.papersGoal);
  const [editOpen, setEditOpen] = useState(false);

  const rows = useMemo(() => {
    // Build per-day stats from attempts + papers (authoritative), merged with history snapshots for goal-at-the-time.
    const map = new Map<
      string,
      { day: string; correct: number; passed: number; qGoal: number; pGoal: number }
    >();
    for (const a of attempts) {
      if (!a.isCorrect) continue;
      const d = dayKeyFor(new Date(a.ts));
      const r = map.get(d) ?? {
        day: d,
        correct: 0,
        passed: 0,
        qGoal: questionsGoal,
        pGoal: papersGoal,
      };
      r.correct += 1;
      map.set(d, r);
    }
    for (const p of papers) {
      if (p.kind !== "submit" || p.marks === undefined || p.total === undefined) continue;
      if (!isPaperPassForGoal(p.marks, p.total)) continue;
      const d = dayKeyFor(new Date(p.ts));
      const r = map.get(d) ?? {
        day: d,
        correct: 0,
        passed: 0,
        qGoal: questionsGoal,
        pGoal: papersGoal,
      };
      r.passed += 1;
      map.set(d, r);
    }
    // Merge in snapshot goals
    for (const [d, rec] of Object.entries(history)) {
      const r = map.get(d) ?? {
        day: d,
        correct: 0,
        passed: 0,
        qGoal: rec.questionsGoal,
        pGoal: rec.papersGoal,
      };
      r.qGoal = rec.questionsGoal;
      r.pGoal = rec.papersGoal;
      map.set(d, r);
    }
    return Array.from(map.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [attempts, papers, history, questionsGoal, papersGoal]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/60 bg-card p-5 sm:p-6"
    >
      <header className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <LuTarget size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold">Daily goals history</h2>
          <p className="text-xs text-muted-foreground">
            Current: {questionsGoal} questions · {papersGoal} papers / day.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
        >
          <LuSettings size={12} /> Change goals
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border/60 rounded-xl">
          No goal history yet — solve some questions to start tracking.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Questions</th>
                <th className="text-left py-2 px-3">Papers</th>
                <th className="text-left py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const qMet = r.correct >= r.qGoal;
                const pMet = r.passed >= r.pGoal;
                return (
                  <tr key={r.day} className="border-t border-border/40">
                    <td className="py-2 px-3 font-bold">{r.day}</td>
                    <td className="py-2 px-3 tabular-nums">
                      {r.correct} / {r.qGoal}
                    </td>
                    <td className="py-2 px-3 tabular-nums">
                      {r.passed} / {r.pGoal}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <Badge met={qMet} label="Q" />
                        <Badge met={pMet} label="P" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EditGoalsModal open={editOpen} onClose={() => setEditOpen(false)} />
    </motion.section>
  );
}

function Badge({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold text-[10px] ${
        met
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40"
          : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {met ? <LuCheck size={10} /> : <LuX size={10} />} {label}
    </span>
  );
}

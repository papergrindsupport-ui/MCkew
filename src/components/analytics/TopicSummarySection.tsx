// Topic Summary — one row per topic the user has attempted. Shows attempts,
// accuracy, strength bar, and drills into detail on click.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LuBookOpen, LuTarget } from "react-icons/lu";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { byTopic } from "@/lib/analytics";

export function TopicSummarySection({ highlightKey }: { highlightKey?: string | null }) {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const rows = useMemo(() => byTopic(attempts), [attempts]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        No topics attempted yet — answer some questions to build a topic summary.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <LuBookOpen size={14} />
        </div>
        <h3 className="text-sm font-bold">Topic summary</h3>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {rows.length} topic{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-2">
        {rows.map((r, i) => {
          const pct = Math.round(r.accuracy * 100);
          const highlight = highlightKey === r.key;
          return (
            <motion.li
              key={r.key}
              id={`topic-row-${r.key}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className={`rounded-xl border-2 p-3 transition-colors ${
                highlight
                  ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
                  : "border-border/60 bg-background"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.correct}/{r.attempted} correct · strength {r.strength}/100
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-bold tabular-nums">
                  <LuTarget size={12} className="text-primary" />
                  {pct}%
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.strength}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={
                    r.strength >= 60
                      ? "h-full bg-emerald-500"
                      : r.strength >= 40
                        ? "h-full bg-amber-500"
                        : "h-full bg-red-500"
                  }
                />
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

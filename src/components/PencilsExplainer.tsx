// Interactive pencils explainer — lets users model their own paper:
// pick number of questions per difficulty, whether they passed, and see the
// exact pencil award. Used on /leaderboard and /dashboard/analytics.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuPencil, LuCheck, LuTrophy, LuChevronDown } from "react-icons/lu";
import { PENCILS_BY_DIFFICULTY, PAPER_PASS_BONUS } from "@/stores/usePencilsStore";
import type { Difficulty } from "@/data/topics";
import { DIFFICULTY_COLORS } from "@/data/topics";
import { cn } from "@/lib/utils";

const DIFFS: Difficulty[] = ["silly", "easy", "medium", "hard", "devilish"];

export function PencilsExplainer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [counts, setCounts] = useState<Record<Difficulty, number>>({
    silly: 0,
    easy: 2,
    medium: 3,
    hard: 2,
    devilish: 0,
  });
  const [passed, setPassed] = useState(true);

  const correct = useMemo(() => DIFFS.reduce((s, d) => s + counts[d], 0), [counts]);
  const questionPencils = useMemo(
    () => DIFFS.reduce((s, d) => s + counts[d] * PENCILS_BY_DIFFICULTY[d], 0),
    [counts],
  );
  const total = questionPencils + (passed ? PAPER_PASS_BONUS : 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="rounded-3xl border-2 border-border/60 bg-card p-5 sm:p-6"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <LuPencil size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold">How pencils work</h2>
          <p className="text-xs text-muted-foreground">
            {open
              ? "Drag the sliders to model a run."
              : "Click to see how pencils are earned and model your own run."}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"
        >
          <LuChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {/* Difficulty sliders */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {DIFFS.map((d) => (
                  <DifficultyRow
                    key={d}
                    diff={d}
                    count={counts[d]}
                    onChange={(v) => setCounts((c) => ({ ...c, [d]: v }))}
                  />
                ))}
              </div>

              {/* Paper pass toggle */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPassed((p) => !p)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 cursor-pointer transition",
                    passed
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground hover:border-emerald-400/50",
                  )}
                >
                  <LuTrophy size={12} />
                  {passed ? "Paper passed (≥50%)" : "Paper not passed"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  Passing a paper adds a flat <b className="text-foreground">+{PAPER_PASS_BONUS}</b>{" "}
                  bonus.
                </span>
              </div>

              {/* Total */}
              <div className="mt-5 rounded-2xl border-2 border-primary/40 bg-primary/10 p-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-primary">
                  <LuPencil size={22} />
                  <div className="text-4xl font-bold tabular-nums">{total}</div>
                </div>
                <div className="text-xs text-muted-foreground flex-1 min-w-[140px]">
                  <div className="font-bold text-foreground">
                    {correct} correct answer{correct === 1 ? "" : "s"}
                    {passed ? " + pass bonus" : ""}
                  </div>
                  <div className="mt-0.5">
                    {DIFFS.filter((d) => counts[d] > 0)
                      .map(
                        (d) =>
                          `${counts[d]}×${d[0].toUpperCase() + d.slice(1)} (${
                            counts[d] * PENCILS_BY_DIFFICULTY[d]
                          })`,
                      )
                      .join(" · ") || "No questions"}
                    {passed && ` · pass (+${PAPER_PASS_BONUS})`}
                  </div>
                </div>
              </div>

              {/* Rule table */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DIFFS.map((d) => (
                  <div
                    key={d}
                    className={cn(
                      "rounded-xl border px-2 py-1.5 text-center",
                      DIFFICULTY_COLORS[d],
                    )}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                      {d}
                    </div>
                    <div className="text-sm font-bold flex items-center justify-center gap-0.5 mt-0.5">
                      <LuPencil size={11} /> +{PENCILS_BY_DIFFICULTY[d]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function DifficultyRow({
  diff,
  count,
  onChange,
}: {
  diff: Difficulty;
  count: number;
  onChange: (v: number) => void;
}) {
  const MAX = 10;
  return (
    <div className="rounded-2xl border-2 border-border/60 bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
            DIFFICULTY_COLORS[diff],
          )}
        >
          {diff}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          +{PENCILS_BY_DIFFICULTY[diff]}/q
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{count}</span>
        <span className="text-[10px] text-muted-foreground">correct</span>
        <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-primary tabular-nums">
          <LuPencil size={10} />
          {count * PENCILS_BY_DIFFICULTY[diff]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={MAX}
        step={1}
        value={count}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 accent-primary cursor-pointer"
        aria-label={`${diff} correct answers`}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuPartyPopper, LuTarget, LuX, LuArrowUp, LuCheck } from "react-icons/lu";
import { create } from "zustand";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";
import { fireConfetti } from "@/lib/confetti";

type GoalKind = "questions" | "papers";

interface CongratsState {
  kind: GoalKind | null;
  open: (k: GoalKind) => void;
  close: () => void;
}

export const useGoalCongratsStore = create<CongratsState>((set) => ({
  kind: null,
  open: (kind) => set({ kind }),
  close: () => set({ kind: null }),
}));

export function GoalCongratsModal() {
  const { kind, close } = useGoalCongratsStore();
  const { questionsGoal, papersGoal, setQuestionsGoal, setPapersGoal } = useDailyGoalsStore();

  const [editing, setEditing] = useState<null | { val: number }>(null);

  useEffect(() => {
    if (kind) {
      setEditing(null);
      fireConfetti?.();
    }
  }, [kind]);

  if (!kind) return null;
  const current = kind === "questions" ? questionsGoal : papersGoal;
  const noun = kind === "questions" ? "questions" : "papers";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative w-full max-w-md rounded-3xl border-[3px] border-border bg-card p-6 shadow-2xl"
          style={{ boxShadow: "6px 8px 0px hsl(var(--border))" }}
        >
          <button
            onClick={close}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted cursor-pointer"
            aria-label="Close"
          >
            <LuX size={16} />
          </button>

          {editing === null ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3"
              >
                <LuPartyPopper size={30} />
              </motion.div>
              <h2 className="text-2xl font-bold text-center">
                Yay! You finished your daily {noun} goal!
              </h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                You hit{" "}
                <span className="font-bold text-foreground">
                  {current} {noun}
                </span>{" "}
                today. Keep the momentum going 🔥
              </p>
              <div className="mt-5 space-y-2">
                <button
                  onClick={close}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold bg-primary text-primary-foreground border-[3px] border-border cursor-pointer"
                  style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
                >
                  <LuCheck size={16} /> I'll keep it up
                </button>
                <button
                  onClick={() => setEditing({ val: current + (kind === "questions" ? 5 : 1) })}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold bg-card text-foreground border-[3px] border-border cursor-pointer"
                >
                  <LuArrowUp size={16} /> I want to set a higher goal
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                <LuTarget size={30} />
              </div>
              <h2 className="text-2xl font-bold text-center">Set a new daily {noun} goal</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Current goal: <span className="font-bold text-foreground">{current}</span>
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={() => setEditing({ val: Math.max(1, editing.val - 1) })}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-background font-bold cursor-pointer"
                >
                  −
                </button>
                <div className="min-w-[5rem] text-center rounded-2xl border-[3px] border-border bg-background px-4 py-2 text-3xl font-bold tabular-nums">
                  {editing.val}
                </div>
                <button
                  onClick={() => setEditing({ val: editing.val + 1 })}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-background font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-2xl px-4 py-3 font-bold bg-card border-2 border-border cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (kind === "questions") setQuestionsGoal(editing.val);
                    else setPapersGoal(editing.val);
                    close();
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 font-bold bg-primary text-primary-foreground border-[3px] border-border cursor-pointer"
                  style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
                >
                  Save goal
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

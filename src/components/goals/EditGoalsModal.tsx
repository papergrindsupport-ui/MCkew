import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuX, LuTarget } from "react-icons/lu";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";

export function EditGoalsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { questionsGoal, papersGoal, setQuestionsGoal, setPapersGoal } = useDailyGoalsStore();
  const [q, setQ] = useState(questionsGoal);
  const [p, setP] = useState(papersGoal);

  useEffect(() => {
    if (open) {
      setQ(questionsGoal);
      setP(papersGoal);
    }
  }, [open, questionsGoal, papersGoal]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-full max-w-md rounded-3xl border-[3px] border-border bg-card p-6"
            style={{ boxShadow: "6px 8px 0px hsl(var(--border))" }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted cursor-pointer"
              aria-label="Close"
            >
              <LuX size={16} />
            </button>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">
              <LuTarget size={26} />
            </div>
            <h2 className="text-2xl font-bold text-center">Edit daily goals</h2>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Adjust your daily targets.
            </p>

            <div className="mt-5 space-y-4">
              <GoalRow label="Questions per day" value={q} onChange={setQ} />
              <GoalRow label="Papers per day" value={p} onChange={setP} />
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl px-4 py-3 font-bold bg-card border-2 border-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setQuestionsGoal(q);
                  setPapersGoal(p);
                  onClose();
                }}
                className="flex-1 rounded-2xl px-4 py-3 font-bold bg-primary text-primary-foreground border-[3px] border-border cursor-pointer"
                style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoalRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 bg-background p-3">
      <div className="text-sm font-bold">{label}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-9 h-9 rounded-xl border-2 border-border bg-card font-bold cursor-pointer"
        >
          −
        </button>
        <div className="min-w-[3.5rem] text-center rounded-xl border-2 border-border bg-card px-3 py-1.5 text-xl font-bold tabular-nums">
          {value}
        </div>
        <button
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-xl border-2 border-border bg-card font-bold cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

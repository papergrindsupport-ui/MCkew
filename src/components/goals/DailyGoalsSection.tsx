import { useMemo } from "react";
import { motion } from "framer-motion";
import { LuTarget, LuCheck, LuBookOpen, LuSettings } from "react-icons/lu";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";
import { todaysCorrect, todaysPassedPapers } from "@/lib/dailyGoals";
import { RadialProgress } from "./RadialProgress";

interface Props {
  onEdit?: () => void;
}

export function DailyGoalsSection({ onEdit }: Props) {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);
  const questionsGoal = useDailyGoalsStore((s) => s.questionsGoal);
  const papersGoal = useDailyGoalsStore((s) => s.papersGoal);

  const { correct, passed } = useMemo(
    () => ({ correct: todaysCorrect(attempts), passed: todaysPassedPapers(papers) }),
    [attempts, papers],
  );

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
          <h2 className="text-base font-bold">Today's Goals</h2>
          <p className="text-xs text-muted-foreground">Your daily practice targets.</p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
          >
            <LuSettings size={12} /> Edit goals
          </button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 place-items-center">
        <RadialProgress
          value={correct}
          goal={questionsGoal}
          label="Questions"
          icon={<LuCheck size={16} />}
        />
        <RadialProgress
          value={passed}
          goal={papersGoal}
          label="Papers"
          icon={<LuBookOpen size={16} />}
        />
      </div>
    </motion.section>
  );
}

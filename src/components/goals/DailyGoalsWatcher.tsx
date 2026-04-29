// Watches the analytics store; when today's correct-answer count or passed-
// paper count crosses the respective goal, fires the congrats modal exactly
// once per day. Also keeps the daily-goals history snapshot in sync.

import { useEffect } from "react";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { useDailyGoalsStore, dayKeyFor } from "@/stores/useDailyGoalsStore";
import { todaysCorrect, todaysPassedPapers } from "@/lib/dailyGoals";
import { useGoalCongratsStore } from "./GoalCongratsModal";

export function DailyGoalsWatcher() {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);

  useEffect(() => {
    const day = dayKeyFor();
    const correct = todaysCorrect(attempts, day);
    const passed = todaysPassedPapers(papers, day);

    const gs = useDailyGoalsStore.getState();
    gs.updateProgress(day, correct, passed);

    if (
      gs.onboarded &&
      correct >= gs.questionsGoal &&
      gs.questionsGoal > 0 &&
      !gs.celebratedQuestions[day]
    ) {
      gs.markCelebratedQuestions(day);
      useGoalCongratsStore.getState().open("questions");
    }
    if (gs.onboarded && passed >= gs.papersGoal && gs.papersGoal > 0 && !gs.celebratedPapers[day]) {
      gs.markCelebratedPapers(day);
      // If questions modal is already open, queue papers after a short delay.
      setTimeout(() => useGoalCongratsStore.getState().open("papers"), 200);
    }
  }, [attempts, papers]);

  return null;
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuSparkles, LuLoader, LuChevronUp } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "./MarkdownView";
import { callGeminiAI } from "@/lib/aiClient";
import { usePaperSession } from "@/components/papers/PaperSession";
import { TOPICS, SKILLS } from "@/data/topics";
import type { Question } from "@/data/questionData";

function topicLabel(key?: string) {
  if (!key) return undefined;
  return TOPICS.find((t) => t.key === key)?.label ?? key;
}
function lessonLabel(topicKey?: string, lessonKey?: string) {
  if (!topicKey || !lessonKey) return undefined;
  const t = TOPICS.find((x) => x.key === topicKey);
  return t?.lessons.find((l) => l.key === lessonKey)?.label ?? lessonKey;
}
function skillLabel(key: string) {
  for (const grp of SKILLS) {
    const s = grp.sub.find((x) => x.key === key);
    if (s) return s.label;
  }
  return key;
}

function flattenRich(rich: any): string {
  if (typeof rich === "string") return rich;
  if (Array.isArray(rich)) return rich.map(flattenRich).join(" ");
  if (rich && typeof rich === "object") {
    if ("text" in rich) return rich.text;
    if ("children" in rich) return flattenRich(rich.children);
    return Object.values(rich).map(flattenRich).join(" ");
  }
  return "";
}

function summarize(q: Question, userAnswer: any, correct: any) {
  return {
    qNumber: q.number,
    text: flattenRich(q.text).slice(0, 300),
    correct,
    userAnswer,
    topic: topicLabel((q as any).topic),
    lesson: lessonLabel((q as any).topic, (q as any).lesson),
    skills: ((q as any).skills ?? []).map(skillLabel),
    tags: q.tags ?? [],
    difficulty: q.difficulty,
  };
}

export function AIFeedbackPanel() {
  const session = usePaperSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (feedback) {
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const questions = session.questions;
      let correctCount = 0;
      let wrong = 0;
      let unanswered = 0;
      const missed: any[] = [];
      const correctList: any[] = [];

      for (const q of questions) {
        const sel = session.selected[q.id];
        const cor = session.correctFor(q);
        if (sel == null) {
          unanswered++;
          missed.push(summarize(q, null, cor));
        } else if (sel === cor) {
          correctCount++;
          correctList.push(summarize(q, sel, cor));
        } else {
          wrong++;
          missed.push(summarize(q, sel, cor));
        }
      }

      const total = questions.length;
      const percent = total ? Math.round((correctCount / total) * 100) : 0;

      const data = await callGeminiAI("feedback", {
        paper: { id: session.paperId, totalQuestions: total },
        performance: { totalQuestions: total, correct: correctCount, wrong, unanswered, percent },
        missed: missed.slice(0, 25),
        correctList: correctList.slice(0, 25),
      });
      setFeedback(data.feedback || "(no feedback returned)");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={generate} className="rounded-full gap-1.5">
        <LuSparkles size={14} /> AI Feedback
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden col-span-full w-full mt-4"
          >
            <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 font-bold text-primary text-lg">
                  <LuSparkles size={18} /> Personalized AI Feedback
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Collapse"
                >
                  <LuChevronUp size={18} />
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
                  <LuLoader size={18} className="animate-spin" />
                  AI is analyzing your performance…
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {feedback && <MarkdownView>{feedback}</MarkdownView>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

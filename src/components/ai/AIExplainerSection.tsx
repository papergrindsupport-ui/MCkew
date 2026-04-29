import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuSparkles,
  LuLoader,
  LuChevronDown,
  LuChevronUp,
  LuMessageCircle,
  LuTrophy,
  LuRefreshCw,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "./MarkdownView";
import { AIChatWidget } from "./AIChatWidget";
import { callGeminiAI } from "@/lib/aiClient";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { TOPICS, SKILLS } from "@/data/topics";

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

function buildQuestionPayload(
  question: Question,
  userAnswer: string | null | undefined,
  correct: string | null | undefined,
) {
  const optionsFlat: Record<string, string> = {};
  if (question.options) {
    for (const [letter, opt] of Object.entries(question.options)) {
      optionsFlat[letter] = flattenRich((opt as any)?.text ?? opt);
    }
  }
  return {
    text: flattenRich(question.text),
    intro: flattenRich(question.intro),
    options: optionsFlat,
    correct,
    userAnswer,
    subject: (question as any).subject,
    topic: topicLabel((question as any).topic),
    lesson: lessonLabel((question as any).topic, (question as any).lesson),
    skills: ((question as any).skills ?? []).map(skillLabel),
    tags: question.tags ?? [],
    difficulty: question.difficulty,
  };
}

interface TestMeQ {
  text: string;
  options: Record<string, string>;
  correct: string;
  rationale?: string;
  userAnswer?: string;
  marked?: boolean;
  explanation?: string;
}

export function AIExplainerSection({
  question,
  userAnswer,
  correct,
}: {
  question: Question;
  userAnswer: string | null | undefined;
  correct: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Test-me loop state
  const [testQs, setTestQs] = useState<TestMeQ[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [mastered, setMastered] = useState(false);

  const ctxPayload = buildQuestionPayload(question, userAnswer, correct);

  const fetchExplanation = async () => {
    if (explanation) {
      setExpanded(true);
      return;
    }
    setExpanded(true);
    setLoading(true);
    setError(null);
    try {
      const data = await callGeminiAI("explain", { question: ctxPayload });
      setExplanation(data.explanation || "(no explanation returned)");
      setImages(data.images || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startTestMe = async () => {
    if (testQs.length >= 3 || mastered) return;
    setTestLoading(true);
    try {
      const data = await callGeminiAI("testme", {
        question: ctxPayload,
        previousAttempts: testQs.map((t) => t.text),
      });
      if (data.error) throw new Error(data.error);
      setTestQs((prev) => [...prev, { ...data, marked: false }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTestLoading(false);
    }
  };

  const answerTestMe = async (idx: number, letter: string) => {
    const q = testQs[idx];
    if (!q || q.marked) return;
    const isCorrect = letter === q.correct;
    const updated = [...testQs];
    updated[idx] = { ...q, userAnswer: letter, marked: true };
    setTestQs(updated);

    if (isCorrect) {
      setMastered(true);
    } else if (testQs.length < 3) {
      // Generate explanation for the wrong answer
      try {
        const data = await callGeminiAI("explain_testme", {
          question: q,
          userAnswer: letter,
          correct: q.correct,
        });
        const updated2 = [...updated];
        updated2[idx] = { ...updated2[idx], explanation: data.explanation };
        setTestQs(updated2);
      } catch (e: any) {
        console.error(e);
      }
      // Auto-generate next question (up to 3 total)
      if (testQs.length < 3) {
        setTimeout(startTestMe, 800);
      }
    }
  };

  return (
    <div className="mt-3 print:hidden">
      {!expanded && (
        <Button variant="outline" className="rounded-full gap-1.5" onClick={fetchExplanation}>
          <LuSparkles size={14} /> Explain with AI
        </Button>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 font-bold text-primary">
                  <LuSparkles size={16} /> AI Explainer
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Collapse"
                >
                  <LuChevronUp size={16} />
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                  <LuLoader size={16} className="animate-spin" />
                  AI is preparing an explanation…
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {explanation && (
                <>
                  <MarkdownView>{explanation}</MarkdownView>

                  {images.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {images.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`AI explainer illustration ${i + 1}`}
                          className="rounded-xl border border-border w-full"
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-full gap-1.5"
                      onClick={startTestMe}
                      disabled={testLoading || mastered || testQs.length >= 3}
                    >
                      {testLoading ? (
                        <LuLoader size={14} className="animate-spin" />
                      ) : (
                        <LuRefreshCw size={14} />
                      )}
                      {testQs.length === 0 ? "Test me" : "Try another"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5"
                      onClick={() => setChatOpen(true)}
                    >
                      <LuMessageCircle size={14} /> Chat with AI
                    </Button>
                  </div>

                  {/* Test-me questions */}
                  {testQs.length > 0 && (
                    <div className="mt-5 space-y-4">
                      {testQs.map((tq, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border-2 border-border/60 bg-background/60 p-4"
                        >
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            AI Practice Q{idx + 1}
                          </div>
                          <div className="font-medium mb-3">{tq.text}</div>
                          <div className="space-y-2">
                            {Object.entries(tq.options).map(([letter, label]) => {
                              const isUser = tq.userAnswer === letter;
                              const isCorrect = tq.correct === letter;
                              const showColor = tq.marked;
                              return (
                                <button
                                  key={letter}
                                  onClick={() => answerTestMe(idx, letter)}
                                  disabled={tq.marked}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-xl border-2 text-sm transition flex items-start gap-2",
                                    !showColor &&
                                      "border-border/60 hover:border-primary hover:bg-primary/5",
                                    showColor &&
                                      isCorrect &&
                                      "border-emerald-500/60 bg-emerald-500/10",
                                    showColor &&
                                      isUser &&
                                      !isCorrect &&
                                      "border-red-500/60 bg-red-500/10",
                                    showColor &&
                                      !isCorrect &&
                                      !isUser &&
                                      "border-border/40 opacity-60",
                                  )}
                                >
                                  <span className="font-bold">{letter}.</span>
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                          {tq.marked && tq.userAnswer === tq.correct && (
                            <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                              <LuTrophy size={16} /> You mastered the topic!
                            </div>
                          )}
                          {tq.explanation && (
                            <div className="mt-3 rounded-xl bg-muted/50 p-3">
                              <MarkdownView>{tq.explanation}</MarkdownView>
                            </div>
                          )}
                        </div>
                      ))}
                      {!mastered && testQs.length >= 3 && testQs[testQs.length - 1]?.marked && (
                        <div className="text-sm text-muted-foreground italic">
                          That's 3 attempts — review the explanation above and try again later.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {explanation && (
        <AIChatWidget
          open={chatOpen}
          onOpenChange={setChatOpen}
          initialAssistantMessage={explanation}
          context={`Question: ${ctxPayload.text}\nCorrect: ${correct}\nUser answer: ${userAnswer}`}
        />
      )}
    </div>
  );
}

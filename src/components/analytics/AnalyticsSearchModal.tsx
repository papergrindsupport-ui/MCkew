// Local analytics search — searches sections, topics, and questions you have
// attempted on the /dashboard/analytics page. Opens with Cmd/Ctrl+K or via
// the search button on the page itself.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuSearch, LuX, LuBookOpen, LuLayoutGrid, LuFileQuestion } from "react-icons/lu";
import { TOPICS } from "@/data/topics";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { getQuestion } from "@/lib/analytics";
import type { Question } from "@/data/questionData";

type SectionId =
  | "overview"
  | "skills"
  | "papers"
  | "timeline"
  | "topic-summary"
  | "pencils-explainer";

export type SearchResult =
  | { kind: "section"; id: SectionId; title: string; subtitle: string }
  | { kind: "topic"; key: string; label: string; attempted: number }
  | { kind: "question"; question: Question; isCorrect: boolean };

const SECTIONS: { id: SectionId; title: string; subtitle: string }[] = [
  { id: "overview", title: "Overview", subtitle: "Accuracy, tiles, trends" },
  { id: "skills", title: "Skills & Topics", subtitle: "Per-skill / per-topic breakdown" },
  { id: "papers", title: "Papers", subtitle: "Passed / failed / total marks" },
  { id: "timeline", title: "Timeline", subtitle: "Every question & paper event" },
  { id: "topic-summary", title: "Topic summary", subtitle: "One row per attempted topic" },
  { id: "pencils-explainer", title: "How pencils work", subtitle: "Interactive reward explainer" },
];

export function AnalyticsSearchModal({
  open,
  onClose,
  onPickSection,
  onPickTopic,
  onPickQuestion,
}: {
  open: boolean;
  onClose: () => void;
  onPickSection: (id: SectionId) => void;
  onPickTopic: (key: string) => void;
  onPickQuestion: (q: Question) => void;
}) {
  const [q, setQ] = useState("");
  const attempts = useAnalyticsStore((s) => s.attempts);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return {
        sections: SECTIONS.map((s) => ({ kind: "section" as const, ...s })) as SearchResult[],
        topics: [] as SearchResult[],
        questions: [] as SearchResult[],
      };
    }

    // Sections
    const sections: SearchResult[] = SECTIONS.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.subtitle.toLowerCase().includes(needle),
    ).map((s) => ({ kind: "section", ...s }));

    // Topics — only show topics with at least one attempt
    const topicAtt = new Map<string, number>();
    for (const a of attempts) {
      const qq = getQuestion(a.questionId);
      if (!qq) continue;
      for (const t of qq.topics) topicAtt.set(t, (topicAtt.get(t) ?? 0) + 1);
    }
    const topics: SearchResult[] = TOPICS.filter((t) => t.label.toLowerCase().includes(needle))
      .filter((t) => topicAtt.has(t.key))
      .slice(0, 8)
      .map((t) => ({
        kind: "topic",
        key: t.key,
        label: t.label,
        attempted: topicAtt.get(t.key) ?? 0,
      }));

    // Questions — from attempts
    const seen = new Set<string>();
    const questions: SearchResult[] = [];
    for (const a of attempts) {
      if (seen.has(a.questionId)) continue;
      const qq = getQuestion(a.questionId);
      if (!qq) continue;
      const hay = `${qq.number} ${qq.paperId} ${(qq.topics || []).join(" ")} ${
        "stem" in qq && typeof (qq as any).stem === "string" ? (qq as any).stem : ""
      }`.toLowerCase();
      if (hay.includes(needle)) {
        seen.add(a.questionId);
        questions.push({ kind: "question", question: qq, isCorrect: a.isCorrect });
        if (questions.length >= 20) break;
      }
    }

    return { sections, topics, questions };
  }, [q, attempts]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-md flex items-start justify-center pt-[8vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border-2 border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-border/60">
              <LuSearch size={16} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sections, topics, or questions…"
                className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground"
              />
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center cursor-pointer"
              >
                <LuX size={14} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              <Group
                title="Sections"
                icon={<LuLayoutGrid size={12} />}
                empty="No matching section."
                hideIfEmpty={!!q.trim() && results.sections.length === 0}
              >
                {results.sections.map((r) =>
                  r.kind === "section" ? (
                    <ResultRow
                      key={r.id}
                      title={r.title}
                      subtitle={r.subtitle}
                      onClick={() => {
                        onPickSection(r.id);
                        onClose();
                      }}
                    />
                  ) : null,
                )}
              </Group>

              {results.topics.length > 0 && (
                <Group title="Topics" icon={<LuBookOpen size={12} />}>
                  {results.topics.map((r) =>
                    r.kind === "topic" ? (
                      <ResultRow
                        key={r.key}
                        title={r.label}
                        subtitle={`${r.attempted} attempt${r.attempted === 1 ? "" : "s"}`}
                        onClick={() => {
                          onPickTopic(r.key);
                          onClose();
                        }}
                      />
                    ) : null,
                  )}
                </Group>
              )}

              {results.questions.length > 0 && (
                <Group title="Questions" icon={<LuFileQuestion size={12} />}>
                  {results.questions.map((r) =>
                    r.kind === "question" ? (
                      <ResultRow
                        key={r.question.id}
                        title={`Q${r.question.number} · ${r.question.paperId}`}
                        subtitle={(r.question.topics || []).join(", ") || "—"}
                        rightLabel={r.isCorrect ? "correct" : "wrong"}
                        rightTone={r.isCorrect ? "emerald" : "red"}
                        onClick={() => {
                          onPickQuestion(r.question);
                          onClose();
                        }}
                      />
                    ) : null,
                  )}
                </Group>
              )}

              {q.trim() &&
                results.sections.length === 0 &&
                results.topics.length === 0 &&
                results.questions.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No results for "{q}"
                  </div>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Group({
  title,
  icon,
  children,
  hideIfEmpty,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty?: string;
  hideIfEmpty?: boolean;
}) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : children;
  if (hideIfEmpty) return null;
  return (
    <div className="mb-1">
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-0.5">{arr}</ul>
    </div>
  );
}

function ResultRow({
  title,
  subtitle,
  onClick,
  rightLabel,
  rightTone,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  rightLabel?: string;
  rightTone?: "emerald" | "red";
}) {
  const rightCls =
    rightTone === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-red-500/15 text-red-600 dark:text-red-400";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted/60 cursor-pointer flex items-center gap-3 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        </div>
        {rightLabel && (
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rightCls}`}
          >
            {rightLabel}
          </span>
        )}
      </button>
    </li>
  );
}

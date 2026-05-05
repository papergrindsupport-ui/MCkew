import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LuTrophy,
  LuChevronDown,
  LuChevronUp,
  LuRotateCcw,
  LuEye,
  LuSparkles,
  LuTarget,
  LuFilter,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePaperSession } from "./PaperSession";
import { parsePaperId, PAPERS } from "@/data/paperData";
import {
  getPaperThresholds,
  pickThresholds,
  availableFormats,
  LETTER_ORDER,
  NUMBER_ORDER,
  type AggregateKind,
  type GradeFormat,
  type LetterGrade,
  type NumberGrade,
  type PaperThresholds,
} from "@/data/gradeThresholds";
import { TOPICS, SKILLS } from "@/data/topics";
import { AIFeedbackPanel } from "@/components/ai/AIFeedbackPanel";

function topicLabel(key: string): string {
  return TOPICS.find((t) => t.key === key)?.label ?? key;
}
function lessonLabel(topicKey: string, lessonKey: string): string {
  const topic = TOPICS.find((t) => t.key === topicKey);
  return topic?.lessons.find((l) => l.key === lessonKey)?.label ?? lessonKey;
}
function skillLabel(key: string): string {
  for (const grp of SKILLS) {
    const s = grp.sub.find((x) => x.key === key);
    if (s) return s.label;
  }
  return key;
}

const KIND_OPTIONS: { key: AggregateKind; label: string }[] = [
  { key: "specific", label: "This paper" },
  { key: "highest", label: "Highest in subject" },
  { key: "lowest", label: "Lowest in subject" },
  { key: "average", label: "Subject average" },
];

export function PaperSummary() {
  const session = usePaperSession();
  const [showDetail, setShowDetail] = useState(false);
  const [kind, setKind] = useState<AggregateKind>("specific");
  const [format, setFormat] = useState<GradeFormat | null>(null);

  const subject = parsePaperId(session.paperId)?.subject;
  const allIds = useMemo(() => PAPERS.map((p) => p.id), []);
  const thresholds = useMemo(
    () =>
      subject
        ? pickThresholds(session.paperId, subject, allIds, kind)
        : getPaperThresholds(session.paperId),
    [subject, session.paperId, allIds, kind],
  );
  const formats = availableFormats(thresholds);
  const activeFormat: GradeFormat =
    format && formats.includes(format) ? format : (formats[0] ?? "letter");

  const grade = useMemo(
    () => gradeForComponent(session.totalMark, thresholds, activeFormat),
    [session.totalMark, thresholds, activeFormat],
  );

  const gradeBoundaryNote = useMemo(
    () => boundaryComparisonNote(session.totalMark, thresholds, activeFormat, grade),
    [session.totalMark, thresholds, activeFormat, grade],
  );

  const gradeNote = useMemo(() => {
    if (activeFormat === "number" && grade === "8") {
      return "A*/9 do not exist for individual components like paper-2, but an 8 here gives you a solid chance at A*/9 overall.";
    }
    if (activeFormat === "letter" && grade === "A") {
      return "A*/9 do not exist for individual components like paper-2, but an A here gives you a solid chance at A*/9 overall.";
    }
    return null;
  }, [activeFormat, grade]);

  const missed = useMemo(
    () =>
      session.questions
        .map((q, i) => {
          const sel = session.selected[q.id];
          const correct = session.correctFor(q);
          const ok = sel === correct;
          return { q, i, sel, correct, ok };
        })
        .filter((r) => !r.ok),
    [session],
  );

  const scrollToFirst = () => {
    const el = document.getElementById(`question-${session.questions[0]?.number}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Auto-scroll to results card on mount (i.e. on submit)
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function gradeForComponent(
    marks: number,
    thresholds: PaperThresholds,
    format: GradeFormat,
  ): string {
    if (format === "letter") {
      const t = thresholds.letter;
      if (!t) return "—";
      const order = LETTER_ORDER.filter((grade) => grade !== "A*") as LetterGrade[];
      for (const g of order) {
        if (marks >= t[g]) return g;
      }
    } else {
      const t = thresholds.number;
      if (!t) return "—";
      const order = NUMBER_ORDER.slice(1) as NumberGrade[];
      for (const g of order) {
        if (marks >= t[g]) return g;
      }
    }
    return "U";
  }

  function boundaryComparisonNote(
    marks: number,
    thresholds: PaperThresholds,
    format: GradeFormat,
    grade: string,
  ): string | null {
    if (format === "letter") {
      const t = thresholds.letter;
      if (!t) return null;
      const order = LETTER_ORDER.filter((g) => g !== "A*") as LetterGrade[];
      const currentIndex = order.indexOf(grade as LetterGrade);
      if (currentIndex === -1) return null;

      const currentGrade = order[currentIndex];
      const currentBoundary = t[currentGrade];
      if (currentBoundary == null) return null;

      const neighbors = [] as Array<{ grade: string; boundary: number }>;
      if (currentIndex > 0) {
        const higherGrade = order[currentIndex - 1];
        const higherBoundary = t[higherGrade];
        if (higherBoundary != null) {
          neighbors.push({ grade: higherGrade, boundary: higherBoundary });
        }
      }
      neighbors.push({ grade: currentGrade, boundary: currentBoundary });
      if (currentIndex < order.length - 1) {
        const lowerGrade = order[currentIndex + 1];
        const lowerBoundary = t[lowerGrade];
        if (lowerBoundary != null) {
          neighbors.push({ grade: lowerGrade, boundary: lowerBoundary });
        }
      }

      const nearest = neighbors.reduce((best, next) =>
        Math.abs(marks - next.boundary) < Math.abs(marks - best.boundary) ? next : best,
      );

      const diff = marks - nearest.boundary;
      const marksText = `${Math.abs(diff)} mark${Math.abs(diff) === 1 ? "" : "s"}`;
      if (diff === 0) {
        return `On the ${nearest.grade} boundary.`;
      }
      const direction = diff > 0 ? "above" : "below";
      return `${marksText} ${direction} the ${nearest.grade} boundary.`;
    }

    const t = thresholds.number;
    if (!t) return null;
    const order = NUMBER_ORDER.slice(1) as NumberGrade[];
    const currentIndex = order.indexOf(grade as NumberGrade);
    if (currentIndex === -1) return null;

    const currentGrade = order[currentIndex];
    const currentBoundary = t[currentGrade];
    if (currentBoundary == null) return null;

    const neighbors = [] as Array<{ grade: string; boundary: number }>;
    if (currentIndex > 0) {
      const higherGrade = order[currentIndex - 1];
      const higherBoundary = t[higherGrade];
      if (higherBoundary != null) {
        neighbors.push({ grade: higherGrade, boundary: higherBoundary });
      }
    }
    neighbors.push({ grade: currentGrade, boundary: currentBoundary });
    if (currentIndex < order.length - 1) {
      const lowerGrade = order[currentIndex + 1];
      const lowerBoundary = t[lowerGrade];
      if (lowerBoundary != null) {
        neighbors.push({ grade: lowerGrade, boundary: lowerBoundary });
      }
    }

    const nearest = neighbors.reduce((best, next) =>
      Math.abs(marks - next.boundary) < Math.abs(marks - best.boundary) ? next : best,
    );

    const diff = marks - nearest.boundary;
    const marksText = `${Math.abs(diff)} mark${Math.abs(diff) === 1 ? "" : "s"}`;
    if (diff === 0) {
      return `On the ${nearest.grade} boundary.`;
    }
    const direction = diff > 0 ? "above" : "below";
    return `${marksText} ${direction} the ${nearest.grade} boundary.`;
  }

  return (
    <motion.section
      ref={ref}
      id="paper-summary"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8 mb-8"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="shrink-0 inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <LuTrophy size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Paper complete
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
            <div className="text-4xl sm:text-5xl font-extrabold">
              {session.totalMark}
              <span className="text-2xl text-muted-foreground">/40</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold inline-flex items-center gap-2 text-primary">
              <LuTarget size={20} /> {grade}
            </div>
            {gradeBoundaryNote && (
              <div className="text-sm text-muted-foreground mt-1">{gradeBoundaryNote}</div>
            )}
            {gradeNote && <div className="text-sm text-muted-foreground mt-1">{gradeNote}</div>}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {missed.length === 0
              ? "Perfect score — incredible! 🎉"
              : `${missed.length} question${missed.length === 1 ? "" : "s"} to review`}
          </div>
        </div>
      </div>

      {/* Grade controls */}
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Grade thresholds
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setKind(opt.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
                  kind === opt.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Grade format
          </div>
          <div className="flex flex-wrap gap-1.5">
            {formats.length === 0 && (
              <span className="text-sm text-muted-foreground">None available</span>
            )}
            {formats.includes("letter") && (
              <button
                onClick={() => setFormat("letter")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
                  activeFormat === "letter"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                A*-G
              </button>
            )}
            {formats.includes("number") && (
              <button
                onClick={() => setFormat("number")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
                  activeFormat === "number"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                9–1
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={scrollToFirst} className="rounded-full gap-1.5">
          <LuEye size={14} /> Review
        </Button>
        <Button
          variant="outline"
          onClick={() => session.reattemptPaper()}
          className="rounded-full gap-1.5"
        >
          <LuRotateCcw size={14} /> Reattempt
        </Button>
        <AIFeedbackPanel />
      </div>

      {/* Review filter */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
          <LuFilter size={12} /> Review filter:
        </span>
        {(["all", "wrong", "correct"] as const).map((f) => (
          <button
            key={f}
            onClick={() => session.setReviewFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold border-2 transition",
              session.reviewFilter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 hover:border-primary/40",
            )}
          >
            {f === "all" ? "Show all" : f === "wrong" ? "Only wrong" : "Only correct"}
          </button>
        ))}
      </div>

      {/* Detailed summary (collapsible) */}
      <button
        onClick={() => setShowDetail((v) => !v)}
        className="mt-6 w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 border-border/50 bg-card/50 font-bold text-sm hover:border-primary/40 transition"
      >
        <span>Detailed summary</span>
        {showDetail ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
      </button>
      {showDetail && (
        <div className="mt-3 rounded-2xl border-2 border-border/40 bg-card/40 p-4 space-y-2">
          {missed.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No missed questions — nothing to review here.
            </div>
          )}
          {missed.map(({ q, sel, correct }) => {
            const tops = q.topics.map((tk) => {
              const lessonsHere = q.lessons.filter((lk) =>
                TOPICS.find((t) => t.key === tk)?.lessons.some((l) => l.key === lk),
              );
              return `${topicLabel(tk)} > ${lessonsHere.map((lk) => lessonLabel(tk, lk)).join(", ") || "—"}`;
            });
            const skills = q.skills.map(skillLabel);
            return (
              <div
                key={q.id}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-sm py-2 border-b border-border/30 last:border-0"
              >
                <a
                  href={`#question-${q.number}`}
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-muted font-bold hover:bg-primary hover:text-primary-foreground transition"
                >
                  {q.number}
                </a>
                <div className="min-w-0 flex-1 text-muted-foreground">
                  {tops.join(" · ") || "—"}
                  {skills.length > 0 && (
                    <span className="text-foreground/70"> · {skills.join(", ")}</span>
                  )}
                </div>
                <div className="flex gap-2 text-xs font-bold shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40">
                    student: {sel ?? "—"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    correct: {correct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

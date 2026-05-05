import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LuArrowLeft,
  LuBookOpen,
  LuLayers,
  LuClock,
  LuHash,
  LuCalendar,
  LuFileText,
  LuClipboardList,
  LuTarget,
  LuExternalLink,
} from "react-icons/lu";
import Navbar from "@/components/Navbar";
import {
  getPaperById,
  parsePaperId,
  SUBJECT_LABEL,
  SESSION_LABEL,
  SUBJECT_COLORS,
  type Paper,
} from "@/data/paperData";
import { type Question } from "@/data/questionData";
import { getPaperQuestions } from "@/data/paperQuestions";
import { getMergedPaperById, getMergedQuestionsForPaper } from "@/admin/merge";
import { createApiClient } from "@/lib/apiClient";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperSessionProvider, usePaperSession } from "@/components/papers/PaperSession";
import { PaperSettingsButton } from "@/components/papers/PaperSettingsButton";
import { ResetPaperButton } from "@/components/papers/ResetPaperButton";
import { PaperSummary } from "@/components/papers/PaperSummary";
import { SubmitPaperButton } from "@/components/papers/SubmitPaperButton";
import { FloatingTimers, FloatingStopwatch } from "@/components/papers/FloatingTimers";
import { QuestionNavStrip } from "@/components/papers/QuestionNavStrip";
import { BookmarksFloater } from "@/components/papers/QuestionAnnotations";
import { ToolsLauncher } from "@/components/papers/tools/ToolsLauncher";
import { PaperLoadingScreen } from "@/components/papers/PaperLoadingScreen";
import { ResumePaperModal } from "@/components/papers/ResumePaperModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/smart-solve-papers_/$paperId")({
  loader: async ({ params }) => {
    let paper = getMergedPaperById(params.paperId) ?? getPaperById(params.paperId);

    // If not found in local/merged data, fetch from API
    // (handles direct link opens before AdminStoreHydrator finishes)
    if (!paper) {
      try {
        const api = createApiClient();
        const overrides = await api.getPapersOverrides();
        const remotePaper = overrides.papers.find((p) => p.id === params.paperId);
        if (remotePaper) {
          // Construct a minimal Paper object from remote data
          const parsed = parsePaperId(params.paperId);
          if (parsed) {
            paper = {
              id: params.paperId,
              subject: parsed.subject,
              year: parsed.year,
              session: parsed.session,
              variant: parsed.variant,
              title:
                (remotePaper.title as string) ??
                `${parsed.year} ${parsed.session} ${parsed.variant}`,
              locked: (remotePaper.locked as boolean) ?? false,
              difficulty: (remotePaper.difficulty as string) ?? undefined,
              priority: (remotePaper.priority as string) ?? undefined,
              gradeThresholds: ((remotePaper.grade_thresholds ?? []) as any[]) ?? [],
              tags: ((remotePaper.tags ?? []) as string[]) ?? [],
              topics: ((remotePaper.topics ?? []) as string[]) ?? [],
              lessons: ((remotePaper.lessons ?? []) as string[]) ?? [],
              skills: ((remotePaper.skills ?? []) as string[]) ?? [],
              questionIds: [],
              bentoSize: (remotePaper.bento_size as "sm" | "md" | "lg") ?? "md",
            } as Paper;
          }
        }
      } catch {
        // Silently fail - will still throw notFound() below if no paper found
      }
    }

    if (!paper) throw notFound();
    return { paper, questions: getMergedQuestionsForPaper(params.paperId) };
  },
  // Only show the tic-tac-toe loader if loading actually takes a moment.
  pendingMs: 150,
  pendingMinMs: 400,
  pendingComponent: PaperLoadingScreen,
  head: ({ loaderData }) => {
    const p = loaderData?.paper;
    const title = p
      ? `${SUBJECT_LABEL[p.subject]} ${p.title} — Smart Solve`
      : "Paper — Smart Solve";
    const desc = p
      ? `Practice ${SUBJECT_LABEL[p.subject]} ${p.title} (40 MCQ questions, 40 marks).`
      : "Practice past paper.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-3">Paper not found</h1>
        <p className="text-muted-foreground mb-6">
          The paper ID format is{" "}
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
            subject-year-session-variant
          </code>
          , e.g. <code className="font-mono bg-muted px-1.5 py-0.5 rounded">bio-2024-June-V2</code>.
        </p>
        <Link
          to="/smart-solve-papers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold"
        >
          <LuArrowLeft size={14} /> Back to papers
        </Link>
      </main>
    </div>
  ),
  component: PaperPage,
});

function PaperPage() {
  const { paper, questions } = Route.useLoaderData() as { paper: Paper; questions: Question[] };
  return (
    <PaperSessionProvider paperId={paper.id} questions={questions}>
      <PaperPageInner paper={paper} questions={questions} />
    </PaperSessionProvider>
  );
}

function PaperPageInner({ paper, questions }: { paper: Paper; questions: Question[] }) {
  const colors = SUBJECT_COLORS[paper.subject];
  const parsed = parsePaperId(paper.id);
  const session = usePaperSession();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            to="/smart-solve-papers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <LuArrowLeft size={14} /> All papers
          </Link>
          <div className="flex items-center gap-2">
            <ResetPaperButton />
            <ToolsLauncher />
            <PaperSettingsButton />
          </div>
        </div>

        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-3xl p-6 sm:p-8 mb-8 border-2 border-border/60", colors.bg)}
        >
          <div
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest",
              colors.text,
            )}
          >
            <LuBookOpen size={12} /> {SUBJECT_LABEL[paper.subject]}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">{paper.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{paper.id}</p>

          {parsed && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Pill icon={<LuLayers size={11} />}>{SUBJECT_LABEL[parsed.subject]}</Pill>
              <Pill icon={<LuCalendar size={11} />}>{parsed.year}</Pill>
              <Pill icon={<LuClock size={11} />}>{SESSION_LABEL[parsed.session]}</Pill>
              <Pill icon={<LuHash size={11} />}>{parsed.variant}</Pill>
              <Pill>40 MCQ · 40 marks</Pill>
              {paper.difficulty && <Pill>difficulty: {paper.difficulty}</Pill>}
            </div>
          )}

          {/* Resource link buttons (disabled if missing) */}
          <div className="mt-4 flex flex-wrap gap-2">
            <ResourceLink
              href={paper.qpLink}
              icon={<LuFileText size={12} />}
              label="Question paper"
            />
            <ResourceLink
              href={paper.msLink}
              icon={<LuClipboardList size={12} />}
              label="Markscheme"
            />
            <ResourceLink
              href={paper.gtLink}
              icon={<LuTarget size={12} />}
              label="Grade thresholds"
            />
          </div>
        </motion.header>

        {session.paperSubmitted && <PaperSummary />}

        <div className="space-y-6">
          {questions.map((q, i) => {
            // Apply review filter only after submission
            if (session.paperSubmitted && session.reviewFilter !== "all") {
              const sel = session.selected[q.id];
              const correct = session.correctFor(q);
              const isCorrect = sel === correct;
              if (session.reviewFilter === "correct" && !isCorrect) return null;
              if (session.reviewFilter === "wrong" && isCorrect) return null;
            }
            return <QuestionView key={q.id} question={q} index={i} />;
          })}
        </div>

        <SubmitPaperButton />
      </main>

      <FloatingTimers />
      <FloatingStopwatch />
      <QuestionNavStrip />
      {!session.settings.showNavStrip && (
        <BookmarksFloater paperId={paper.id} questions={questions} />
      )}
      <ResumePaperModal />
    </div>
  );
}

function ResourceLink({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
}) {
  const disabled = !href;
  const cls = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
    disabled
      ? "border-border/40 bg-background/40 text-muted-foreground cursor-not-allowed opacity-60"
      : "border-border/60 bg-background/70 hover:border-primary/50 hover:text-primary",
  );
  if (disabled) {
    return (
      <span className={cls} title={`${label} link not available`}>
        {icon} {label} <LuExternalLink size={10} />
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {icon} {label} <LuExternalLink size={10} />
    </a>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/70 border border-border/50 font-bold">
      {icon}
      {children}
    </span>
  );
}

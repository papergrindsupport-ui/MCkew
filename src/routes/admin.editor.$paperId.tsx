import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  LuArrowLeft,
  LuSave,
  LuRocket,
  LuPlus,
  LuChevronUp,
  LuChevronDown,
  LuTrash2,
  LuEye,
  LuFileText,
  LuSettings,
  LuListChecks,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parsePaperId, type Paper } from "@/data/paperData";
import { getAnswerKey } from "@/data/answerKey";
import type { Question, OptionLetter } from "@/data/questionData";
import { OPTION_LETTERS } from "@/data/questionData";
import type { PaperThresholds } from "@/data/gradeThresholds";
import { getPaperThresholds } from "@/data/gradeThresholds";
import {
  getPaperDrafts,
  getDraftQuestionsForPaper,
  getThresholdDrafts,
  savePaperDraft,
  saveDraftQuestions,
  saveDraftThresholds,
  getDraftAnswerKeyForPaper,
  saveDraftAnswerKey,
  publishPaper,
  deletePaperEverywhere,
  subscribeAdminStore,
  type PaperDraft,
} from "@/admin/store";
import { PaperForm } from "@/admin/PaperForm";
import { Section } from "@/admin/ui/Section";
import { QuestionForm, emptyQuestion } from "@/admin/QuestionForm";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperSessionProvider } from "@/components/papers/PaperSession";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  getMergedAnswerKeyForPaper,
  getMergedPaperById,
  getMergedQuestionsForPaper,
} from "@/admin/merge";

export const Route = createFileRoute("/admin/editor/$paperId")({
  component: PaperEditor,
});

function useAdminSnapshot<T>(read: () => T): T {
  return useSyncExternalStore(subscribeAdminStore, read, read);
}

function PaperEditor() {
  const { paperId } = Route.useParams();
  const navigate = useNavigate();
  const drafts = useAdminSnapshot(getPaperDrafts);
  const allDraftQs = useAdminSnapshot(getDraftQuestionsForPaper.bind(null, paperId));
  const allDraftThresholds = useAdminSnapshot(getThresholdDrafts);

  const builtinPaper: Paper | undefined = useMemo(() => getMergedPaperById(paperId), [paperId]);
  const parsed = parsePaperId(paperId);

  // Local working copies (initialized from draft → builtin → blank)
  const [paper, setPaper] = useState<Partial<Paper> & { id: string }>(() => {
    const draft = drafts[paperId];
    if (draft) return { ...draft, id: paperId };
    if (builtinPaper) return { ...builtinPaper };
    return {
      id: paperId,
      subject: parsed?.subject,
      year: parsed?.year,
      session: parsed?.session,
      variant: parsed?.variant,
      title: parsed ? `${parsed.year} ${parsed.session} ${parsed.variant}` : paperId,
    };
  });
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (allDraftQs.length) return allDraftQs;
    if (builtinPaper) return getMergedQuestionsForPaper(paperId);
    return [];
  });
  const [thresholds, setThresholds] = useState<PaperThresholds>(() => {
    return allDraftThresholds[paperId] ?? getPaperThresholds(paperId);
  });
  const [correctMap, setCorrectMap] = useState<Record<string, OptionLetter | null>>(() => {
    const draftKey = getDraftAnswerKeyForPaper(paperId);
    const letters =
      draftKey && draftKey.length === 40
        ? draftKey
        : (getMergedAnswerKeyForPaper(paperId) ?? getAnswerKey(paperId));
    const initialQuestions = allDraftQs.length
      ? allDraftQs
      : builtinPaper
        ? getMergedQuestionsForPaper(paperId)
        : [];
    const map: Record<string, OptionLetter | null> = {};
    initialQuestions.forEach((q, idx) => {
      map[q.id] = letters[idx] ?? "A";
    });
    return map;
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isNew = !builtinPaper;

  // Auto-save draft on every change (debounced via microtask)
  useEffect(() => {
    const t = setTimeout(() => {
      savePaperDraft({ ...paper, id: paperId } as PaperDraft);
      saveDraftQuestions(paperId, questions);
      saveDraftThresholds(paperId, thresholds);
      const letters = questions.map(
        (q, idx) => correctMap[q.id] ?? getAnswerKey(paperId)[idx] ?? "A",
      );
      if (letters.length) saveDraftAnswerKey(paperId, letters.slice(0, 40) as OptionLetter[]);
    }, 300);
    return () => clearTimeout(t);
  }, [paper, questions, thresholds, correctMap, paperId]);

  function addQuestion() {
    const next = [...questions, emptyQuestion(paperId, questions.length + 1)];
    setQuestions(next);
    setActiveIdx(next.length - 1);
  }
  function removeQuestion(i: number) {
    if (!confirm("Remove this question?")) return;
    const next = questions
      .filter((_, j) => j !== i)
      .map((q, j) => ({ ...q, number: String(j + 1) }));
    setQuestions(next);
    setActiveIdx(Math.max(0, Math.min(activeIdx, next.length - 1)));
  }
  function moveQuestion(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((q, k) => (q.number = String(k + 1)));
    setQuestions(next);
    setActiveIdx(j);
  }
  function updateQuestion(i: number, q: Question) {
    const next = questions.slice();
    next[i] = q;
    setQuestions(next);
  }

  function persistDraftNow() {
    savePaperDraft({ ...paper, id: paperId } as PaperDraft);
    saveDraftQuestions(paperId, questions);
    saveDraftThresholds(paperId, thresholds);
  }

  async function publish() {
    if (isPublishing) return;
    setIsPublishing(true);
    // Persist current edits immediately before publishing
    savePaperDraft({
      ...paper,
      id: paperId,
      questionIds: questions.map((q) => q.id),
    } as PaperDraft);
    saveDraftQuestions(paperId, questions);
    saveDraftThresholds(paperId, thresholds);
    const letters = questions.map(
      (q, idx) => correctMap[q.id] ?? getAnswerKey(paperId)[idx] ?? "A",
    );
    if (letters.length === 40) {
      saveDraftAnswerKey(paperId, letters as OptionLetter[]);
    }
    const t = toast.loading("Publishing paper...");
    try {
      const r = await publishPaper(paperId);
      if (r.remote) {
        toast.success("Published! Changes are now live.", { id: t });
      } else if (r.error) {
        toast.error(`Published locally only. Backend error: ${r.error}`, { id: t });
      } else {
        toast.success("Published locally. Sign in as admin to push to backend.", { id: t });
      }
    } catch (e: unknown) {
      const msg = (e as { error?: string })?.error || "Failed to publish paper";
      toast.error(msg, { id: t });
    } finally {
      setIsPublishing(false);
    }
  }

  function downloadBackupTs() {
    const letters = questions.map(
      (q, idx) => correctMap[q.id] ?? getAnswerKey(paperId)[idx] ?? "A",
    );
    const payload = {
      exportedAt: new Date().toISOString(),
      paper,
      thresholds,
      answerKey: letters,
      questions,
    };
    const fileContent = `export const paperBackup = ${JSON.stringify(payload, null, 2)} as const;\n`;
    const blob = new Blob([fileContent], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paperId}.backup.ts`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border bg-card p-3 shadow-sm">
        <Link
          to="/admin/editor"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LuArrowLeft size={13} /> All papers
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <LuEye size={14} /> Preview paper
          </Button>
          <Button variant="outline" onClick={downloadBackupTs}>
            Download .ts
          </Button>
          <Button
            variant="outline"
            loading={isSaving}
            onClick={async () => {
              if (isSaving) return;
              setIsSaving(true);
              try {
                persistDraftNow();
                toast.success("Saved draft");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <LuSave size={14} /> Save draft
          </Button>
          <Button onClick={publish} loading={isPublishing} className="shadow-md">
            <LuRocket size={14} /> Publish
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            loading={isDeleting}
            onClick={async () => {
              if (isDeleting) return;
              if (!confirm("Delete this paper everywhere (drafts + backend)?")) return;
              setIsDeleting(true);
              const t = toast.loading("Deleting paper...");
              try {
                const r = await deletePaperEverywhere(paperId);
                if (r.error) toast.error(`Deleted locally, backend error: ${r.error}`, { id: t });
                else toast.success("Paper deleted", { id: t });
                navigate({ to: "/admin/editor" });
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            <LuTrash2 size={14} /> Delete paper
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-gradient-to-br from-card to-primary/5 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary grid place-items-center">
            <LuFileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{paper.title || paperId}</h1>
            <p className="font-mono text-xs text-muted-foreground">{paperId}</p>
          </div>
        </div>
      </div>

      <Section
        id={`paper-${paperId}-details`}
        icon={LuSettings}
        title="Paper details"
        hint="Identity, links, tags & grade thresholds"
        tone="primary"
      >
        <PaperForm
          paper={paper}
          onChange={(next) => {
            if (next.id !== paperId) {
              savePaperDraft({ ...next });
              saveDraftQuestions(
                next.id,
                questions.map((q) => ({ ...q, paperId: next.id })),
              );
              saveDraftThresholds(next.id, thresholds);
              navigate({ to: "/admin/editor/$paperId", params: { paperId: next.id } });
              return;
            }
            setPaper(next);
          }}
          thresholds={thresholds}
          onThresholdsChange={setThresholds}
          isNew={isNew}
        />
      </Section>

      <Section
        id={`paper-${paperId}-questions`}
        icon={LuListChecks}
        title="Questions"
        hint={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
        action={
          <Button size="sm" onClick={addQuestion}>
            <LuPlus size={14} /> Add question
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-3">
          <aside className="md:max-h-[70vh] md:overflow-y-auto rounded-xl border border-border p-1.5 bg-background">
            <ol className="space-y-0.5">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      i === activeIdx
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "hover:bg-muted",
                    )}
                  >
                    <button
                      className="flex-1 text-left font-mono truncate"
                      onClick={() => setActiveIdx(i)}
                    >
                      <span className="font-bold">Q{q.number}</span>{" "}
                      <span className="text-muted-foreground">{q.questionType ?? "text"}</span>
                    </button>
                    <button
                      title="Move up"
                      onClick={() => moveQuestion(i, -1)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <LuChevronUp size={12} />
                    </button>
                    <button
                      title="Move down"
                      onClick={() => moveQuestion(i, +1)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <LuChevronDown size={12} />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => removeQuestion(i)}
                      className="p-0.5 hover:bg-destructive/20 text-destructive rounded"
                    >
                      <LuTrash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
              {questions.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  No questions yet — click <strong>Add question</strong> above.
                </p>
              )}
            </ol>
          </aside>
          <div>
            {questions[activeIdx] ? (
              <QuestionForm
                question={questions[activeIdx]}
                onChange={(q) => updateQuestion(activeIdx, q)}
                correctLetter={correctMap[questions[activeIdx].id] ?? null}
                onCorrectLetterChange={(l) =>
                  setCorrectMap({ ...correctMap, [questions[activeIdx].id]: l })
                }
              />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Pick a question on the left, or add one.
              </div>
            )}
          </div>
        </div>
      </Section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paper preview ({questions.length} questions)</DialogTitle>
          </DialogHeader>
          <PaperSessionProvider paperId={paperId} questions={questions}>
            <div className="space-y-6">
              {questions.map((q, i) => (
                <QuestionView key={q.id} question={q} index={i} />
              ))}
            </div>
          </PaperSessionProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}

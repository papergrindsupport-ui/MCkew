import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LuDownload,
  LuShare2,
  LuSettings,
  LuPalette,
  LuChevronLeft,
  LuPrinter,
  LuLink,
  LuArrowLeft,
} from "react-icons/lu";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadPayload, type ExportPayload } from "./useExportPayloadStore";
import { BuilderSettingsDialog } from "./BuilderSettingsDialog";
import { useBuilderStore } from "./useBuilderStore";
import { ColorThemeButton, DarkModeButton, useTheme } from "@/components/ThemeSwitcher";
import { PaperSessionProvider, usePaperSession } from "@/components/papers/PaperSession";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperLoadingScreen } from "@/components/papers/PaperLoadingScreen";
import { getAnswerKey } from "@/data/answerKey";
import { getBuilderCorrectLetter } from "./builderQuestionHelpers";
import type { Question, OptionLetter } from "@/data/questionData";
import { RichTextView } from "@/components/papers/RichTextView";
import { resolveRichOrLegacy } from "./types";
import type { BuilderItem, BuilderQuestionItem } from "./types";
import { totalMarks } from "./types";
import { createExamPreviewShare, fetchExamPreviewShare } from "@/lib/examPreviewShareClient";
import type { PaperSettings, QuestionStatus, TimerCfg } from "@/components/papers/PaperSession";

interface Props {
  previewId: string | null;
  shareId?: string | null;
  /** Subject in the URL (used only for the back link). */
  subject: "bio" | "chem" | "phys" | "all";
}

async function prepareExamForPrint() {
  const docWithFonts = document as Document & { fonts?: { ready?: Promise<unknown> } };
  await docWithFonts.fonts?.ready?.catch(() => undefined);

  const root = document.querySelector<HTMLElement>(".exam-preview-print-root");
  const images = Array.from(root?.querySelectorAll("img") ?? []);
  await Promise.allSettled(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.loading = "eager";
          if (img.complete) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export function ExamPreviewPage({ previewId, shareId, subject }: Props) {
  const [payload, setPayload] = useState<ExportPayload | null>(null);
  const [shareMeta, setShareMeta] = useState<{
    id: string;
    audience: "student" | "editor";
    readOnly: boolean;
    subject: "bio" | "chem" | "phys" | "all";
  } | null>(null);
  const [shareInitialSession, setShareInitialSession] = useState<null | {
    settings?: PaperSettings;
    selected?: Record<string, OptionLetter | undefined>;
    status?: Record<string, QuestionStatus>;
    eliminated?: Record<string, OptionLetter[]>;
    paperSubmitted?: boolean;
    reviewFilter?: "all" | "wrong" | "correct";
    timers?: TimerCfg[];
    stopwatchEnabled?: boolean;
    stopwatchRunning?: boolean;
    stopwatchSec?: number;
    stopwatchLaps?: number[];
  }>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();

  // Local interactive form state
  const [studentName, setStudentName] = useState("");
  const [centerNumber, setCenterNumber] = useState("");
  const [signature, setSignature] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overallEarned, setOverallEarned] = useState<string>("");
  const [feedbackPick, setFeedbackPick] = useState<number | null>(null);
  const [shareReadOnly, setShareReadOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (shareId && typeof shareId === "string") {
          const share = await fetchExamPreviewShare(shareId);
          if (cancelled) return;
          setShareMeta({
            id: share.id,
            audience: share.audience,
            readOnly: !!share.readOnly,
            subject: share.subject,
          });
          const data = (share.data ?? {}) as any;
          if (data.fields) {
            setStudentName(String(data.fields.studentName ?? ""));
            setCenterNumber(String(data.fields.centerNumber ?? ""));
            setSignature(String(data.fields.signature ?? ""));
            setDate(String(data.fields.date ?? new Date().toISOString().slice(0, 10)));
            setOverallEarned(String(data.fields.overallEarned ?? ""));
            setFeedbackPick(
              typeof data.fields.feedbackPick === "number" ? data.fields.feedbackPick : null,
            );
          }
          setShareInitialSession((data.paperSession ?? null) as any);
          const draft = data.draft;
          if (draft) {
            setPayload({
              id: share.id,
              createdAt: Date.now(),
              audience: share.audience,
              draft,
            } as any);
          } else {
            setPayload(null);
          }
          setLoading(false);
          return;
        }

        // Local preview id path: load from localStorage.
        if (!previewId) {
          setPayload(null);
          setLoading(false);
          return;
        }
        const p = loadPayload(previewId);
        setPayload(p);
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewId, shareId]);

  // Hydrate the builder store from this payload, so settings modal edits work.
  useEffect(() => {
    if (!payload) return;
    const store = useBuilderStore.getState();
    if (store.draft.id !== payload.draft.id) {
      // Replace the live draft with the payload draft for this tab.
      // We do not persist it back to localStorage of the source tab.
      useBuilderStore.setState({ draft: payload.draft });
    }
  }, [payload]);

  // Re-read settings live from the store so the settings modal updates this view.
  const liveDraft = useBuilderStore((s) => s.draft);
  const draft = payload ? liveDraft : null;
  const settings = draft?.settings;
  const items = draft?.items ?? [];
  const marks = totalMarks(items);

  const sessionQuestions = useMemo<Question[]>(
    () =>
      items.filter((i): i is BuilderQuestionItem => i.kind === "question").map((i) => i.question),
    [items],
  );
  const correctFor = (q: Question): OptionLetter => {
    const local = getBuilderCorrectLetter(q.id);
    if (local !== "A") return local;
    try {
      const key = getAnswerKey(q.paperId);
      const idx = Number(q.number) - 1;
      return key[idx] ?? local;
    } catch {
      return local;
    }
  };

  // Keep a soft on-screen grouping, but let the browser's print engine fill
  // pages naturally so multiple whole questions can sit on one PDF page.
  const pages = useMemo(() => (items.length ? [items] : []), [items]);

  const isShared = !!shareMeta?.id;
  const audience: "student" | "editor" = shareMeta?.audience ?? payload?.audience ?? "editor";
  const readOnly = !!shareMeta?.readOnly;
  const isStudentLink = isShared && audience === "student";
  const [creatingShare, setCreatingShare] = useState(false);

  const [exporting, setExporting] = useState(false);
  // Use the browser's native print pipeline ("Save as PDF" in the print dialog).
  // This preserves the live theme (dark/light + color theme), all fonts, vectors,
  // and avoids the blank-page issues of html2canvas-based exporters.
  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      await prepareExamForPrint();
      toast.message("Choose 'Save as PDF' in the print dialog", {
        description: "Your theme colors will be preserved.",
      });
      window.print();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't open print dialog — try again");
    } finally {
      setExporting(false);
    }
  };
  const handlePrint = async () => {
    await prepareExamForPrint();
    window.print();
  };

  if (loading) {
    return <PaperLoadingScreen />;
  }

  if (!payload || !draft || !settings) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">No preview found</h1>
          <p className="text-sm text-muted-foreground">
            The export link is missing or has expired. Open the builder again and click Export.
          </p>
          <Link
            to="/smart-solve-all"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground"
          >
            <LuArrowLeft size={14} /> Back to Smart Solve
          </Link>
        </div>
      </div>
    );
  }

  const styleOverrides: React.CSSProperties = {
    background: settings.styles.bgColor ?? undefined,
    color: settings.styles.textColor ?? undefined,
    fontFamily: settings.styles.fontFamily ?? undefined,
    fontSize: settings.styles.fontSize ?? undefined,
  };

  return (
    <PaperSessionProvider
      paperId={`exam-preview:${draft.id}`}
      questions={sessionQuestions}
      correctForOverride={correctFor}
      initialSettings={{ submissionMode: "per-question" }}
      storageKey={isShared ? `exam-preview-share:${shareMeta!.id}` : undefined}
      initialState={shareInitialSession ?? undefined}
      readOnly={readOnly}
    >
      <div
        className="min-h-screen bg-muted/30 text-foreground exam-preview-print-root"
        style={styleOverrides}
      >
        <style>{`
        /* Force browsers to keep our theme colors when printing / saving as PDF */
        .exam-preview-print-root,
        .exam-preview-print-root * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
          @media print {
          @page { margin: 9mm; size: A4; }
          html, body {
            background: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide app chrome that shouldn't appear in the printed/PDF output */
          .exam-preview-print-root header.sticky,
          .exam-preview-print-root .print\\:hidden,
          .exam-preview-print-root button:not([data-exam-option]),
          .exam-preview-print-root [role="dialog"],
          .exam-preview-print-root [data-radix-popper-content-wrapper],
          .exam-preview-print-root [data-sonner-toaster],
          [data-radix-popper-content-wrapper],
          [data-sonner-toaster],
          [role="dialog"] {
            display: none !important;
          }
          /* Inputs render as plain underlined text so the doc looks like a paper exam */
          .exam-preview-print-root input,
          .exam-preview-print-root textarea {
            border: 0 !important;
            border-bottom: 1px solid hsl(var(--border)) !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .exam-preview-print-root {
            background: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
          }
          .exam-preview-paper {
            display: block !important;
            max-width: none !important;
            padding: 0 !important;
          }
          .exam-preview-cover {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            margin-bottom: 6mm !important;
            border: 2px solid hsl(var(--border)) !important;
            border-radius: 8px !important;
            background: hsl(var(--card)) !important;
            padding: 7mm !important;
          }
          .exam-preview-page {
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .exam-preview-question-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 4mm !important;
          }
          .exam-preview-question-list > * + * {
            margin-top: 0 !important;
          }
          .exam-preview-print-root article[id^="question-"] {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 5mm !important;
            border-radius: 8px !important;
            border: 1.5px solid hsl(var(--border)) !important;
            background: hsl(var(--card)) !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .exam-preview-print-root article[id^="question-"],
          .exam-preview-print-root .exam-preview-cover,
          .exam-preview-print-root [data-exam-option="true"] {
            opacity: 1 !important;
            transform: none !important;
          }
          .exam-preview-print-root article[id^="question-"] section {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .exam-preview-print-root [data-exam-option="true"] {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            border: 1.25px solid hsl(var(--border)) !important;
            background: hsl(var(--background)) !important;
            padding: 3.5mm !important;
            border-radius: 7px !important;
          }
          .exam-preview-page-header,
          .exam-preview-page-footer {
            display: none !important;
          }
        }
      `}</style>
        {!isStudentLink && (
          <ExamPreviewHeader
            subject={subject}
            title={settings.title}
            docType={settings.docType}
            questionCount={sessionQuestions.length}
            marks={marks}
            onOpenSettings={() => setSettingsOpen(true)}
            creatingShare={creatingShare}
            shareReadOnly={shareReadOnly}
            setShareReadOnly={setShareReadOnly}
            onCopyLink={async (aud) => {
              setCreatingShare(true);
              try {
                const s = usePaperSession();
                const { id } = await createExamPreviewShare({
                  audience: aud,
                  readOnly: shareReadOnly,
                  subject,
                  data: {
                    draft,
                    fields: {
                      studentName,
                      centerNumber,
                      signature,
                      date,
                      overallEarned,
                      feedbackPick,
                    },
                    paperSession: {
                      settings: s.settings,
                      selected: s.selected,
                      status: s.status,
                      eliminated: s.eliminated,
                      paperSubmitted: s.paperSubmitted,
                      reviewFilter: s.reviewFilter,
                      timers: s.timers,
                      stopwatchEnabled: s.stopwatchEnabled,
                      stopwatchRunning: s.stopwatchRunning,
                      stopwatchSec: s.stopwatchSec,
                      stopwatchLaps: s.stopwatchLaps,
                    },
                  },
                });
                const url = `${window.location.origin}/smart-solve-${subject}/exam-preview?share=${encodeURIComponent(id)}`;
                await navigator.clipboard.writeText(url);
                toast.success(aud === "student" ? "Student link copied!" : "Editor link copied!");
              } catch (e: any) {
                toast.error(e?.message ?? "Couldn't create share link");
              } finally {
                setCreatingShare(false);
              }
            }}
          />
        )}

        <main className="exam-preview-paper max-w-4xl mx-auto px-2 sm:px-3 py-8 print:py-0 print:px-0 print:max-w-none">
          {/* Cover */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="exam-preview-cover rounded-3xl border-2 border-border bg-card p-6 sm:p-8 print:shadow-none"
          >
            <div className="flex items-start gap-4">
              {settings.schoolLogo && (
                <img
                  src={settings.schoolLogo}
                  alt="School logo"
                  className="h-16 w-16 object-contain rounded-xl border bg-background p-1.5 shrink-0"
                />
              )}
              <div className="min-w-0">
                {settings.schoolName && (
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    {settings.schoolName}
                  </p>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold mt-1">{settings.title}</h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {settings.docType} · {sessionQuestions.length} questions · {marks} marks
                </p>
                {settings.teacherName && (
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">Teacher:</span>{" "}
                    <span className="font-bold">{settings.teacherName}</span>
                  </p>
                )}
                {settings.deadline && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                      Deadline: {new Date(settings.deadline).toLocaleString()}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border",
                        settings.allowAfterDeadline
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-destructive/10 text-destructive border-destructive/30",
                      )}
                    >
                      {settings.allowAfterDeadline
                        ? settings.latePenalty > 0
                          ? `Late: −${settings.latePenalty} marks`
                          : "Late submissions allowed"
                        : "No late submissions"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Student fields */}
            {(settings.studentFields.askName ||
              settings.studentFields.askCenter ||
              settings.studentFields.askSignature ||
              settings.studentFields.askDate) && (
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {settings.studentFields.askName && (
                  <FieldRow label="Name">
                    <input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      disabled={readOnly}
                      className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-1 font-bold"
                    />
                  </FieldRow>
                )}
                {settings.studentFields.askCenter && (
                  <FieldRow label="Center #">
                    <input
                      value={centerNumber}
                      onChange={(e) => setCenterNumber(e.target.value)}
                      disabled={readOnly}
                      className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-1 font-bold"
                    />
                  </FieldRow>
                )}
                {settings.studentFields.askDate && (
                  <FieldRow label="Date">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={readOnly}
                      className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-1 font-bold"
                    />
                  </FieldRow>
                )}
                {settings.studentFields.askSignature && (
                  <FieldRow label="Signature">
                    <input
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      disabled={readOnly}
                      placeholder="Sign here"
                      className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-1 italic"
                      style={{ fontFamily: "'Brush Script MT', cursive" }}
                    />
                  </FieldRow>
                )}
              </div>
            )}

            {(() => {
              const introRich = resolveRichOrLegacy(settings.introRich, settings.intro);
              if (!introRich) return null;
              return (
                <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                  <p className="text-xs uppercase tracking-widest font-bold text-primary mb-1">
                    Introduction
                  </p>
                  <RichTextView rich={introRich} className="text-sm leading-relaxed" />
                </div>
              );
            })()}
            {(() => {
              const instrRich = resolveRichOrLegacy(
                settings.instructionsRich,
                settings.instructions,
              );
              if (!instrRich) return null;
              return (
                <div className="mt-3 p-4 rounded-2xl bg-muted border border-border">
                  <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">
                    Instructions
                  </p>
                  <RichTextView rich={instrRich} className="text-sm leading-relaxed" />
                </div>
              );
            })()}

            {/* Overall mark + feedback scale */}
            {(settings.overallMark.enabled || settings.feedbackScale.enabled) && (
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {settings.overallMark.enabled && (
                  <div className="p-4 rounded-2xl border-2 border-border bg-background">
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                      Overall mark
                    </p>
                    <div className="flex items-end gap-1">
                      <input
                        type="number"
                        min={0}
                        max={settings.overallMark.total}
                        value={overallEarned}
                        onChange={(e) => setOverallEarned(e.target.value)}
                        disabled={readOnly}
                        placeholder="—"
                        className="w-20 text-3xl font-bold bg-transparent border-b-2 border-border focus:border-primary outline-none"
                      />
                      <span className="text-2xl font-bold text-muted-foreground">
                        / {settings.overallMark.total}
                      </span>
                    </div>
                  </div>
                )}
                {settings.feedbackScale.enabled && (
                  <div className="p-4 rounded-2xl border-2 border-border bg-background">
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                      Feedback
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {settings.feedbackScale.labels.map((l, i) => (
                        <button
                          key={i}
                          onClick={() => setFeedbackPick(i)}
                          disabled={readOnly}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
                            feedbackPick === i
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:border-primary/40",
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Question pages */}
          <div>
            {pages.map((pageItems, pIdx) => {
              // global running question index across pages
              const startQIdx = pages
                .slice(0, pIdx)
                .reduce((n, p) => n + p.filter((i) => i.kind === "question").length, 0);
              const qOnPage = pageItems.filter((i) => i.kind === "question").length;
              let qOffset = 0;
              return (
                <section key={pIdx} className="exam-preview-page mt-8 space-y-5">
                  {/* Page header */}
                  <div className="hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      {settings.schoolLogo && (
                        <img
                          src={settings.schoolLogo}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0"
                        />
                      )}
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
                        {settings.schoolName || settings.title}
                      </span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                      Page {pIdx + 1} / {pages.length}
                    </span>
                  </div>

                  <div className="exam-preview-question-list space-y-6">
                    {pageItems.map((item) => {
                      if (item.kind === "note") {
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border-2 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm whitespace-pre-wrap"
                          >
                            {item.text}
                          </div>
                        );
                      }
                      if (item.kind === "divider") {
                        return (
                          <div
                            key={item.id}
                            className="h-1 rounded-full"
                            style={{ background: item.color }}
                          />
                        );
                      }
                      const idx = startQIdx + qOffset++;
                      return (
                        <QuestionView
                          key={item.id}
                          question={item.question}
                          index={idx}
                          inlineLabel={
                            settings.showQuestionHeaders === false ? `${idx + 1}.` : undefined
                          }
                        />
                      );
                    })}
                  </div>

                  {/* Page footer */}
                  <div className="hidden">
                    <span>{settings.title}</span>
                    <span>
                      {qOnPage} question{qOnPage === 1 ? "" : "s"}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Footer spacer so sticky button never covers the last question */}
          <div className="h-28 sm:h-32 print:hidden" aria-hidden />
        </main>

        {/* Sticky download bar — gradient mask so content fades behind it */}
        <div className="fixed bottom-0 left-0 right-0 z-30 print:hidden pointer-events-none">
          <div className="h-24 bg-gradient-to-t from-background via-background/90 to-transparent" />
          <div className="bg-background/95 backdrop-blur border-t border-border/60 pointer-events-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
              <Button
                onClick={handleDownloadPdf}
                disabled={exporting}
                size="lg"
                className="flex-1 h-14 text-base font-bold shadow-xl shadow-primary/20"
              >
                <LuDownload className="mr-2" size={18} />
                {exporting ? "Generating PDF…" : "Download PDF"}
              </Button>
              <Button
                onClick={handlePrint}
                size="lg"
                variant="outline"
                className="h-14 px-4 font-bold"
                title="Print"
              >
                <LuPrinter size={18} />
              </Button>
            </div>
          </div>
        </div>

        <BuilderSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </PaperSessionProvider>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ExamPreviewHeader({
  subject,
  title,
  docType,
  questionCount,
  marks,
  onOpenSettings,
  creatingShare,
  shareReadOnly,
  setShareReadOnly,
  onCopyLink,
}: {
  subject: "bio" | "chem" | "phys" | "all";
  title: string;
  docType: string;
  questionCount: number;
  marks: number;
  onOpenSettings: () => void;
  creatingShare: boolean;
  shareReadOnly: boolean;
  setShareReadOnly: (v: boolean) => void;
  onCopyLink: (audience: "student" | "editor") => void | Promise<void>;
}) {
  const theme = useTheme();
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/60 print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
        <Link
          to={subject === "all" ? "/smart-solve-all" : `/smart-solve-${subject}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <LuChevronLeft size={16} /> Back
        </Link>
        <div className="ml-2 min-w-0">
          <h1 className="font-bold text-base truncate">{title}</h1>
          <p className="text-[11px] text-muted-foreground capitalize">
            {docType} · {questionCount} Q · {marks} marks
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onOpenSettings} title="Settings">
            <LuSettings size={14} />
          </Button>
          <DarkModeButton isDark={theme.isDark} setIsDark={theme.setIsDark} />
          <ColorThemeButton
            open={theme.open}
            setOpen={theme.setOpen}
            activeTheme={theme.activeTheme}
            setActiveTheme={theme.setActiveTheme}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" className="font-bold" disabled={creatingShare}>
                <LuShare2 className="mr-1.5" size={14} /> Share
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={shareReadOnly}
                  onChange={(e) => setShareReadOnly(e.target.checked)}
                />
                Read-only (viewer can't answer/fill)
              </label>
              <button
                onClick={() => onCopyLink("student")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium text-left"
              >
                <LuLink size={14} /> Copy student link
              </button>
              <button
                onClick={() => onCopyLink("editor")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm font-medium text-left"
              >
                <LuLink size={14} /> Copy editor link
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

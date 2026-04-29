import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { LuChevronDown, LuChevronUp, LuDownload, LuSettings, LuShuffle, LuX } from "react-icons/lu";
import { useBuilderStore } from "./useBuilderStore";
import { BuilderSidebar, type AvailableEntry } from "./BuilderSidebar";
import { BuilderMain } from "./BuilderMain";
import { BuilderEditorDialog } from "./BuilderEditorDialog";
import { BuilderSettingsDialog } from "./BuilderSettingsDialog";
import { BuilderExportWizard } from "./BuilderExportWizard";
import { ColorThemeButton, DarkModeButton, useTheme } from "@/components/ThemeSwitcher";
import { PaperSessionProvider } from "@/components/papers/PaperSession";
import { totalMarks } from "./types";
import type { BuilderQuestionItem } from "./types";
import type { Question, OptionLetter } from "@/data/questionData";
import type { Subject } from "@/data/paperData";
import { Button } from "@/components/ui/button";
import { getAnswerKey } from "@/data/answerKey";
import { getBuilderCorrectLetter } from "./builderQuestionHelpers";
import { toast } from "sonner";

interface Props {
  subject: Subject | "all";
  available: AvailableEntry[];
}

export function BuilderOverlay({ subject, available }: Props) {
  const open = useBuilderStore((s) => s.open);
  const collapsed = useBuilderStore((s) => s.collapsed);
  const setCollapsed = useBuilderStore((s) => s.setCollapsed);
  const setOpen = useBuilderStore((s) => s.setOpen);
  const ensureSubject = useBuilderStore((s) => s.ensureSubject);
  const items = useBuilderStore((s) => s.draft.items);
  const settings = useBuilderStore((s) => s.draft.settings);
  const customQs = useBuilderStore((s) => s.draft.customQuestions);
  const setTitle = useBuilderStore((s) => s.setTitle);
  const addQuestionItem = useBuilderStore((s) => s.addQuestionItem);
  const reorderItems = useBuilderStore((s) => s.reorderItems);
  const shuffle = useBuilderStore((s) => s.shuffle);
  const addCustomQuestion = useBuilderStore((s) => s.addCustomQuestion);
  const updateCustomQuestion = useBuilderStore((s) => s.updateCustomQuestion);
  const updateQuestionSnapshot = useBuilderStore((s) => s.updateQuestionSnapshot);

  useEffect(() => {
    if (open) ensureSubject(subject);
  }, [open, subject, ensureSubject]);

  const marks = totalMarks(items);
  const theme = useTheme();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorQuestion, setEditorQuestion] = useState<Question | null>(null);
  const [editorMode, setEditorMode] = useState<"create-custom" | "edit-custom" | "edit-snapshot">(
    "create-custom",
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showTitles, setShowTitles] = useState(() => settings.showQuestionHeaders !== false);

  // Lock body scroll while the (non-collapsed) builder overlay is open to
  // prevent double-scroll between the page below and the builder's inner panel.
  useEffect(() => {
    if (!open || collapsed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, collapsed]);

  const openCreateCustom = () => {
    setEditorMode("create-custom");
    setEditorQuestion(null);
    setEditingItemId(null);
    setEditorOpen(true);
  };

  const openEditItem = (item: BuilderQuestionItem) => {
    const isCustom = !item.source;
    setEditorMode(isCustom ? "edit-custom" : "edit-snapshot");
    setEditorQuestion(item.question);
    setEditingItemId(item.id);
    setEditorOpen(true);
  };

  const handleSaveEditor = (q: Question) => {
    if (editorMode === "create-custom") {
      addCustomQuestion(q);
      addQuestionItem(q);
      toast.success("Custom question added");
    } else if (editorMode === "edit-custom") {
      updateCustomQuestion(q);
      toast.success("Question updated");
    } else if (editorMode === "edit-snapshot" && editingItemId) {
      updateQuestionSnapshot(editingItemId, q);
      toast.success("Snapshot updated");
    }
  };

  // Build the questions list and a correctness lookup for the embedded session.
  const sessionQuestions = useMemo<Question[]>(
    () =>
      items.filter((i) => i.kind === "question").map((i) => (i as BuilderQuestionItem).question),
    [items],
  );
  const correctFor = (q: Question): OptionLetter => {
    // Custom or snapshot-overridden answer: try builder-local map first.
    const local = getBuilderCorrectLetter(q.id);
    if (local !== "A") return local;
    // Fallback to the original paper key if applicable.
    try {
      const key = getAnswerKey(q.paperId);
      const idx = Number(q.number) - 1;
      return key[idx] ?? local;
    } catch {
      return local;
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as
      | { kind: "available"; question: Question; source: { paperId: string; qid: string } | null }
      | undefined;
    if (data?.kind === "available") {
      addQuestionItem(data.question, data.source ?? undefined);
      return;
    }
    // Reordering: ids match item ids
    if (active.id !== over.id && typeof active.id === "string" && typeof over.id === "string") {
      reorderItems(active.id, over.id);
    }
  };

  if (!open) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div
            key="builder-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center gap-2 px-4 h-14 border-b border-border/60 bg-card/40 backdrop-blur">
              <input
                value={settings.title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent font-bold text-base sm:text-lg outline-none border-b border-transparent focus:border-primary px-1 min-w-0 max-w-[40ch]"
                aria-label="Exam title"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {marks} mark{marks === 1 ? "" : "s"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={shuffle} title="Shuffle questions">
                  <LuShuffle size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  title="Settings"
                >
                  <LuSettings size={14} />
                </Button>
                <DarkModeButton isDark={theme.isDark} setIsDark={theme.setIsDark} />
                <ColorThemeButton
                  open={theme.open}
                  setOpen={theme.setOpen}
                  activeTheme={theme.activeTheme}
                  setActiveTheme={theme.setActiveTheme}
                />
                <Button size="sm" className="font-bold" onClick={() => setExportOpen(true)}>
                  <LuDownload className="mr-1.5" size={14} /> Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCollapsed(true)}
                  title="Collapse"
                >
                  <LuChevronDown size={16} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} title="Close">
                  <LuX size={16} />
                </Button>
              </div>
            </header>

            <div className="flex-1 min-h-0 flex">
              <BuilderSidebar available={available} onCustomClick={openCreateCustom} />
              <PaperSessionProvider
                paperId={`builder:${useBuilderStore.getState().draft.id}`}
                questions={sessionQuestions}
                correctForOverride={correctFor}
                initialSettings={{ submissionMode: "per-question" }}
              >
                <BuilderMain
                  onEditItem={openEditItem}
                  showTitles={showTitles}
                  onShowTitlesChange={setShowTitles}
                />
              </PaperSessionProvider>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="builder-strip"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={() => setCollapsed(false)}
            className="fixed bottom-0 left-0 right-0 z-[100] h-10 bg-primary text-primary-foreground flex items-center justify-center gap-2 font-bold text-sm shadow-lg"
            aria-label="Expand builder"
          >
            <LuChevronUp size={16} />
            Builder · {settings.title} · {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
            {marks} mark{marks === 1 ? "" : "s"}
          </motion.button>
        )}
      </AnimatePresence>

      <BuilderSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BuilderExportWizard open={exportOpen} onOpenChange={setExportOpen} subject={subject} />
      <BuilderEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        question={editorQuestion}
        mode={editorMode}
        onSave={handleSaveEditor}
      />
    </DndContext>
  );
}

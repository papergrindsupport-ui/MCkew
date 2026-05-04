// Shared smart-solve subject page implementation. Used by /smart-solve-bio,
// -chem, -phys, and -all routes.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuLayoutGrid, LuList, LuPlay, LuFileCheck, LuSparkles, LuHammer } from "react-icons/lu";
import { FaAtom, FaDna, FaFlask } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import {
  getMergedAnswerKeyForPaper,
  getMergedPapers,
  getMergedQuestionsForPaper,
} from "@/admin/merge";
// import { getPaperQuestions } from "@/data/paperQuestions";
import { subscribeAdminStore } from "@/admin/store";
import { type Subject, SUBJECT_COLORS, SUBJECTS } from "@/data/paperData";
import { PaperSessionProvider } from "@/components/papers/PaperSession";
import { getAnswerKey } from "@/data/answerKey";
import type { Question, OptionLetter } from "@/data/questionData";
import { ToolsLauncher } from "@/components/papers/tools/ToolsLauncher";
import { cn } from "@/lib/utils";
import {
  buildQuestionRows,
  applyQuestionFilters,
  makeDefaultQuestionFilters,
  sanitizeQuestionFilters,
  type QuestionFilters,
} from "@/components/smart-solve/filterQuestions";
import { QuestionGenerator } from "@/components/smart-solve/QuestionGenerator";
import { GeneralMode } from "@/components/smart-solve/GeneralMode";
import { PlayMode } from "@/components/smart-solve/PlayMode";
import { ExamMode } from "@/components/smart-solve/ExamMode";
import { SmartSolveSettingsButton } from "@/components/smart-solve/SmartSolveSettingsButton";
import { useSmartSolveStore } from "@/components/smart-solve/useSmartSolveStore";
import { MultiPaperBookmarksFloater } from "@/components/papers/QuestionAnnotations";
import { SearchControl } from "@/components/smart-solve/SearchControl";
import { useSmartSolveSearchStore } from "@/components/smart-solve/useSmartSolveSearchStore";
import { HighlightProvider } from "@/components/smart-solve/HighlightContext";
import { questionMatches } from "@/components/smart-solve/searchEngine";
import { SelectionActionBar, SelectModeButton } from "@/components/smart-solve/SelectionActionBar";
import { BuilderOverlay } from "@/components/builder/BuilderOverlay";
import { useBuilderStore } from "@/components/builder/useBuilderStore";
import type { AvailableEntry } from "@/components/builder/BuilderSidebar";
import {
  filtersToParams,
  paramsToFilters,
  readUrlParams,
  writeUrlParams,
  selectedIdsFromString,
  selectedIdsToString,
} from "@/components/smart-solve/useUrlState";

const SUBJECT_ICON: Record<Subject, typeof FaDna> = {
  bio: FaDna,
  chem: FaFlask,
  phys: FaAtom,
};

interface Props {
  /** Restrict to this subject. Omit for /smart-solve-all. */
  subject?: Subject;
  title: string;
}

export function SmartSolveSubjectPage({ subject, title }: Props) {
  const PAPERS = useSyncExternalStore(subscribeAdminStore, getMergedPapers, getMergedPapers);
  // Defaults are stable per subject — used both for initial state and as a
  // baseline for diffing into URL params.
  const defaultFilters = useMemo(() => makeDefaultQuestionFilters(subject), [subject]);
  const filtersStorageKey = useMemo(() => `smart-solve-filters-v1:${subject ?? "all"}`, [subject]);
  const [filters, setFilters] = useState<QuestionFilters>(() => {
    if (typeof window === "undefined") return defaultFilters;
    // URL wins on first load when it carries any filter params; otherwise
    // restore from localStorage; otherwise fall back to defaults.
    const params = readUrlParams();
    let hasFilterParams = false;
    params.forEach((_v, k) => {
      if (
        k.startsWith("f_") ||
        k === "sortBy" ||
        k === "sortDir" ||
        k === "oldSyl" ||
        k === "locked"
      ) {
        hasFilterParams = true;
      }
    });
    if (hasFilterParams) {
      return sanitizeQuestionFilters(paramsToFilters(defaultFilters, params), subject);
    }
    try {
      const raw = window.localStorage.getItem(filtersStorageKey);
      if (raw)
        return sanitizeQuestionFilters(
          { ...defaultFilters, ...JSON.parse(raw) } as QuestionFilters,
          subject,
        );
    } catch {
      /* ignore */
    }
    return defaultFilters;
  });

  // Persist filters → localStorage whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(filtersStorageKey, JSON.stringify(filters));
    } catch {
      /* ignore quota errors */
    }
  }, [filters, filtersStorageKey]);

  // Re-load from localStorage when subject changes (storage key change).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(filtersStorageKey);
      if (raw) {
        setFilters(
          sanitizeQuestionFilters(
            { ...defaultFilters, ...JSON.parse(raw) } as QuestionFilters,
            subject,
          ),
        );
      } else {
        setFilters(defaultFilters);
      }
    } catch {
      /* ignore */
    }
  }, [defaultFilters, filtersStorageKey, subject]);

  // Mirror filters → URL whenever they change. Diffed against defaults so the
  // URL stays clean when the user is on the default view.
  useEffect(() => {
    const params = filtersToParams(filters, defaultFilters);
    // Clear any keys the page owns that aren't in `params`.
    const allKeys = Object.keys(filtersToParams(defaultFilters, defaultFilters));
    const writes: Record<string, string | null> = {};
    for (const k of allKeys) writes[k] = null;
    Object.assign(writes, params);
    // The above only clears *known* keys (if any). For correctness with
    // dynamic keys, walk current URL too.
    const cur = readUrlParams();
    cur.forEach((_v, k) => {
      if (
        k.startsWith("f_") ||
        k === "sortBy" ||
        k === "sortDir" ||
        k === "oldSyl" ||
        k === "locked"
      ) {
        if (!(k in params)) writes[k] = null;
      }
    });
    writeUrlParams(writes);
  }, [filters, defaultFilters]);

  // Build all rows (subject-restricted at the row source level so /smart-solve-bio truly only knows bio)
  const allRows = useMemo(() => {
    const papers = subject ? PAPERS.filter((p) => p.subject === subject) : PAPERS;
    return buildQuestionRows(papers, getMergedQuestionsForPaper);
  }, [PAPERS, subject]);

  const filteredByGenerator = useMemo(
    () => applyQuestionFilters(allRows, filters),
    [allRows, filters],
  );

  // Apply smart search on top of (or independently of) the generator filters.
  const search = useSmartSolveSearchStore();
  const filtered = useMemo(() => {
    const base = search.active && !search.considerFilters ? allRows : filteredByGenerator;
    if (!search.active) return base;
    return base.filter((r) =>
      questionMatches(r.q, search.query, search.mode, search.questionScope),
    );
  }, [
    filteredByGenerator,
    allRows,
    search.active,
    search.considerFilters,
    search.query,
    search.mode,
    search.questionScope,
  ]);

  // Per-subject answer-key cache for fast correctFor lookup
  const correctFor = (q: Question): OptionLetter => {
    const idx = Number(q.number) - 1;
    const key = getMergedAnswerKeyForPaper(q.paperId) ?? getAnswerKey(q.paperId);
    return key[idx] ?? "A";
  };

  // Synthetic paperId (used for storage namespacing only)
  const sessionPaperId = subject ? `smart-solve-${subject}` : "smart-solve-all";

  return (
    <PaperSessionProvider
      paperId={sessionPaperId}
      questions={filtered.map((r) => r.q)}
      correctForOverride={correctFor}
      initialSettings={{ submissionMode: "per-question" }}
      storageKey={sessionPaperId}
    >
      <Inner
        title={title}
        subject={subject}
        filtered={filtered}
        filters={filters}
        setFilters={setFilters}
      />
    </PaperSessionProvider>
  );
}

function Inner({
  title,
  subject,
  filtered,
  filters,
  setFilters,
}: {
  title: string;
  subject?: Subject;
  filtered: { q: Question; paper: import("@/data/paperData").Paper }[];
  filters: QuestionFilters;
  setFilters: (f: QuestionFilters) => void;
}) {
  const ss = useSmartSolveStore();
  const mode = ss.mode;
  const search = useSmartSolveSearchStore();
  const builderOpen = useBuilderStore((s) => s.open);
  const selectionStorageKey = `smart-solve-selection-v1:${subject ?? "all"}`;
  const [selectMode, setSelectMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (readUrlParams().get("select") === "1") return true;
    try {
      return window.localStorage.getItem(`${selectionStorageKey}:mode`) === "1";
    } catch {
      return false;
    }
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const fromUrl = readUrlParams().get("sel");
    if (fromUrl) return selectedIdsFromString(fromUrl);
    try {
      const raw = window.localStorage.getItem(`${selectionStorageKey}:ids`);
      if (raw) return selectedIdsFromString(raw);
    } catch {
      /* ignore */
    }
    return new Set();
  });

  // Persist selection state → localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${selectionStorageKey}:mode`, selectMode ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [selectMode, selectionStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (selectedIds.size > 0) {
        window.localStorage.setItem(`${selectionStorageKey}:ids`, selectedIdsToString(selectedIds));
      } else {
        window.localStorage.removeItem(`${selectionStorageKey}:ids`);
      }
    } catch {
      /* ignore */
    }
  }, [selectedIds, selectionStorageKey]);

  // ── Hydrate persisted stores from URL on mount (URL wins on first load) ──
  useEffect(() => {
    const params = readUrlParams();
    const m = params.get("mode");
    if (m === "general" || m === "play" || m === "exam") {
      if (m !== useSmartSolveStore.getState().mode) useSmartSolveStore.getState().setMode(m);
    }
    const layout = params.get("layout");
    if (layout === "expanded" || layout === "compact") {
      if (layout !== useSmartSolveStore.getState().generalLayout)
        useSmartSolveStore.getState().setGeneralLayout(layout);
    }
    const builder = params.get("builder");
    if (builder === "1" && !useBuilderStore.getState().open)
      useBuilderStore.getState().setOpen(true);

    const q = params.get("q");
    const sStore = useSmartSolveSearchStore.getState();
    if (q != null && q !== sStore.query) sStore.setQuery(q);
    if (q && q.trim()) sStore.submit();
    const sm = params.get("sm");
    if (sm) sStore.setMode(sm as never);
    const sq = params.get("sq");
    if (sq) sStore.setQuestionScope(sq as never);
    const cf = params.get("cf");
    if (cf != null) sStore.setConsiderFilters(cf === "1");
  }, []);

  // ── Mirror state → URL ──
  useEffect(() => {
    writeUrlParams({ mode: ss.mode === "general" ? null : ss.mode });
  }, [ss.mode]);
  useEffect(() => {
    writeUrlParams({ layout: ss.generalLayout === "expanded" ? null : ss.generalLayout });
  }, [ss.generalLayout]);
  useEffect(() => {
    writeUrlParams({ builder: builderOpen ? "1" : null });
  }, [builderOpen]);
  useEffect(() => {
    writeUrlParams({ select: selectMode ? "1" : null });
  }, [selectMode]);
  useEffect(() => {
    writeUrlParams({ sel: selectedIds.size > 0 ? selectedIdsToString(selectedIds) : null });
  }, [selectedIds]);
  useEffect(() => {
    // Only mirror submitted (active) query — the modal's in-progress text
    // shouldn't pollute the URL on every keystroke.
    writeUrlParams({
      q: search.active && search.query.trim() ? search.query : null,
      sm: search.active && search.mode !== "broad" ? search.mode : null,
      sq: search.active && search.questionScope !== "everything" ? search.questionScope : null,
      cf: search.considerFilters ? null : "0",
    });
  }, [search.active, search.query, search.mode, search.questionScope, search.considerFilters]);

  // Cmd-K on smart-solve-* pages opens the local contextual search modal,
  // overriding the global Cmd-K handler in the navbar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        useSmartSolveSearchStore.getState().setModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const selectableIds = useMemo(() => filtered.map((r) => `${r.paper.id}:${r.q.id}`), [filtered]);
  const selectedVisibleCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectableIds.length > 0 && selectedVisibleCount === selectableIds.length;
  const toggleQuestion = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const selection = { active: selectMode, selectedIds, onToggle: toggleQuestion };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 mb-6"
        >
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
              <LuSparkles className="animate-pulse" /> Smart Solve
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} question{filtered.length === 1 ? "" : "s"} ready to solve
            </p>
            {!subject && <AllSubjectsLegend />}
          </div>
          <div className="flex items-center gap-2">
            <SearchControl variant="questions" />
            <ToolsLauncher />
            <SmartSolveSettingsButton />
          </div>
        </motion.header>

        <QuestionGenerator
          filters={filters}
          setFilters={setFilters}
          resultCount={filtered.length}
          showSubjectFilter={!subject}
          subject={subject}
        />

        {/* Mode switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <ModeButton
            active={mode === "general"}
            onClick={() => ss.setMode("general")}
            icon={LuLayoutGrid}
            label="General"
          />
          <ModeButton
            active={mode === "play"}
            onClick={() => ss.setMode("play")}
            icon={LuPlay}
            label="Play"
          />
          <ModeButton
            active={mode === "exam"}
            onClick={() => ss.setMode("exam")}
            icon={LuFileCheck}
            label="Exam"
          />
          <BuilderModeButton subject={subject} filtered={filtered} />

          {mode === "general" && (
            <div className="ml-auto inline-flex rounded-full border-2 border-border/60 overflow-hidden">
              <button
                onClick={() => ss.setGeneralLayout("expanded")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1",
                  ss.generalLayout === "expanded" && "bg-primary text-primary-foreground",
                )}
              >
                <LuLayoutGrid size={12} /> Expanded
              </button>
              <button
                onClick={() => ss.setGeneralLayout("compact")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1",
                  ss.generalLayout === "compact" && "bg-primary text-primary-foreground",
                )}
              >
                <LuList size={12} /> Compact
              </button>
            </div>
          )}
          {mode === "general" && (
            <SelectModeButton active={selectMode} onClick={() => setSelectMode((s) => !s)} />
          )}
        </div>

        <AnimatePresence initial={false}>
          {mode === "general" && selectMode && (
            <SelectionActionBar
              selectedCount={selectedVisibleCount}
              totalCount={selectableIds.length}
              label="questions"
              allSelected={allSelected}
              onToggleAll={toggleAll}
              saveTarget={{
                kind: "questions-bulk",
                items: Array.from(selectedIds)
                  .filter((id) => selectableIds.includes(id))
                  .map((id) => {
                    const [paperId, qid] = id.split(":");
                    return { paperId, qid };
                  }),
              }}
            />
          )}
        </AnimatePresence>

        {/* Mode body */}
        <HighlightProvider query={search.active ? search.query : ""} mode={search.mode}>
          {mode === "general" && <GeneralMode rows={filtered} selection={selection} />}
          {mode === "play" && <PlayMode rows={filtered} />}
          {mode === "exam" && <ExamMode rows={filtered} />}
        </HighlightProvider>
      </main>
      <MultiPaperBookmarksFloater
        items={filtered.map((r) => ({
          paperId: r.paper.id,
          qid: r.q.id,
          label: String(r.q.number),
          targetId: `smartq-${r.paper.id}-${r.q.id}`,
        }))}
      />
      <BuilderMount subject={subject} filtered={filtered} />
    </div>
  );
}

function AllSubjectsLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {SUBJECTS.map((entry) => {
        const Icon = SUBJECT_ICON[entry.key];
        const colors = SUBJECT_COLORS[entry.key];
        return (
          <span
            key={entry.key}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
              colors.soft,
              colors.ring,
            )}
          >
            <Icon size={12} />
            {entry.label}
          </span>
        );
      })}
    </div>
  );
}

function BuilderModeButton({
  subject,
  filtered,
}: {
  subject?: Subject;
  filtered: { q: Question; paper: import("@/data/paperData").Paper }[];
}) {
  const setOpen = useBuilderStore((s) => s.setOpen);
  return (
    <ModeButton
      active={false}
      onClick={() => {
        // Snapshot the available list at click time via component state in parent
        setOpen(true);
      }}
      icon={LuHammer}
      label="Builder"
    />
  );
  // available list is provided by BuilderMount below
  void subject;
  void filtered;
}

function BuilderMount({
  subject,
  filtered,
}: {
  subject?: Subject;
  filtered: { q: Question; paper: import("@/data/paperData").Paper }[];
}) {
  const customQs = useBuilderStore((s) => s.draft.customQuestions);
  const available: AvailableEntry[] = useMemo(() => {
    const fromPapers: AvailableEntry[] = filtered.map(({ q, paper }) => ({
      id: `${paper.id}:${q.id}`,
      question: q,
      source: { paperId: paper.id, qid: q.id },
      title: `${paper.title || paper.id} · Q${q.number}`,
    }));
    const fromCustom: AvailableEntry[] = customQs.map((q) => ({
      id: q.id,
      question: q,
      source: null,
      title: `Custom · Q${q.number}`,
    }));
    return [...fromCustom, ...fromPapers];
  }, [filtered, customQs]);
  return <BuilderOverlay subject={subject ?? "all"} available={available} />;
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LuPlay;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.92, rotate: -2 }}
      animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={
        active
          ? { duration: 0.4, ease: "easeOut", times: [0, 0.5, 1] }
          : { type: "spring", stiffness: 380, damping: 20 }
      }
      className={cn(
        "relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border-2 cursor-pointer overflow-hidden",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
          : "bg-card border-border hover:border-primary/50",
      )}
    >
      <motion.span
        animate={active ? { rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="inline-flex"
      >
        <Icon size={14} />
      </motion.span>
      {label}
    </motion.button>
  );
}

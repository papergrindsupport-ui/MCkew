import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useSyncExternalStore, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuLayoutGrid, LuSparkles } from "react-icons/lu";
import Navbar from "@/components/Navbar";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { LayoutChooserModal } from "@/components/papers/LayoutChooserModal";
import { BentoLayout } from "@/components/papers/BentoLayout";
import { OrganizedLayout } from "@/components/papers/OrganizedLayout";
import { MultistepLayout } from "@/components/papers/MultistepLayout";
import {
  Generator,
  makeDefaultFilters,
  applyFilters,
  type GeneratorFilters,
} from "@/components/papers/Generator";
import { getMergedPapers } from "@/admin/merge";
import { subscribeAdminStore } from "@/admin/store";
import { SearchControl } from "@/components/smart-solve/SearchControl";
import { useSmartSolveSearchStore } from "@/components/smart-solve/useSmartSolveSearchStore";
import { paperMatches, questionMatches } from "@/components/smart-solve/searchEngine";
import { getPaperQuestions } from "@/data/paperQuestions";
import { SelectionActionBar, SelectModeButton } from "@/components/smart-solve/SelectionActionBar";
import { RecentPapersSection } from "@/components/papers/RecentPapersSection";
import { PinnedPapersSection } from "@/components/papers/PinnedPapersSection";
import {
  genFiltersToParams,
  paramsToGenFilters,
  readUrlParams,
  writeUrlParams,
  hasAnyFilterParam,
} from "@/components/smart-solve/useUrlState";

export const Route = createFileRoute("/smart-solve-papers")({
  head: () => ({
    meta: [
      { title: "Smart Solve Papers — Practice Past Papers" },
      { name: "description", content: "Browse and solve past papers in your favourite layout." },
      { property: "og:title", content: "Smart Solve Papers" },
      {
        property: "og:description",
        content: "Browse and solve past papers in your favourite layout.",
      },
    ],
  }),
  component: SmartSolvePapersPage,
});

function SmartSolvePapersPage() {
  const layout = useLayoutStore((s) => s.layout);
  const hasChosen = useLayoutStore((s) => s.hasChosen);
  const hideLocked = useLayoutStore((s) => s.hideLocked);
  const [chooserOpen, setChooserOpen] = useState(false);
  const defaultFilters = useMemo(() => makeDefaultFilters(), []);
  const [filters, setFilters] = useState<GeneratorFilters>(() => {
    if (typeof window === "undefined") return defaultFilters;
    const params = readUrlParams();
    if (hasAnyFilterParam(params)) return paramsToGenFilters(defaultFilters, params);
    return defaultFilters;
  });

  // Mirror filters → URL (clean diff vs defaults).
  useEffect(() => {
    const next = genFiltersToParams(filters, defaultFilters);
    const updates: Record<string, string | null> = { ...next };
    // Clear any owned keys that aren't currently set.
    const owned = [
      "f_subjects",
      "f_years",
      "f_sessions",
      "f_variants",
      "f_gts",
      "f_topics",
      "f_skills",
      "f_tags",
      "f_difficulty",
      "f_priority",
      "sortBy",
      "sortDir",
    ];
    for (const k of owned) if (!(k in next)) updates[k] = null;
    writeUrlParams(updates);
  }, [filters, defaultFilters]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const PAPERS = useSyncExternalStore(subscribeAdminStore, getMergedPapers, getMergedPapers);
  const search = useSmartSolveSearchStore();

  // Cmd-K opens the local contextual search modal (overrides global Cmd-K).
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
  const filtered = useMemo(() => {
    const baseAll = hideLocked ? PAPERS.filter((p) => !p.locked) : PAPERS;
    const generatorFiltered = layout === "multistep" ? baseAll : applyFilters(baseAll, filters);
    if (!search.active) return generatorFiltered;
    const base = search.considerFilters ? generatorFiltered : baseAll;
    return base.filter((p) => {
      if (paperMatches(p, search.query, search.mode)) return true;
      if (search.paperScope === "papersAndQuestions") {
        const qs = getPaperQuestions(p.id);
        return qs.some((q) => questionMatches(q, search.query, search.mode, "everything"));
      }
      return false;
    });
  }, [
    filters,
    layout,
    hideLocked,
    PAPERS,
    search.active,
    search.considerFilters,
    search.query,
    search.mode,
    search.paperScope,
  ]);
  const selectableIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const selectedVisibleCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectableIds.length > 0 && selectedVisibleCount === selectableIds.length;
  const togglePaper = (id: string) => {
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
  const selection = { active: selectMode, selectedIds, onToggle: togglePaper };

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
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">Past Papers</h1>
            <p className="text-sm text-muted-foreground">
              {layout === "multistep"
                ? "Step through and pick a paper."
                : `${filtered.length} papers ready to solve`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SelectModeButton active={selectMode} onClick={() => setSelectMode((s) => !s)} />
            <button
              type="button"
              onClick={() => setChooserOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition"
            >
              <LuLayoutGrid size={14} /> Change layout
            </button>
            <SearchControl variant="papers" />
          </div>
        </motion.header>

        <PinnedPapersSection />
        <RecentPapersSection />

        {layout && layout !== "multistep" && (
          <Generator filters={filters} setFilters={setFilters} resultCount={filtered.length} />
        )}

        <AnimatePresence initial={false}>
          {selectMode && (
            <SelectionActionBar
              selectedCount={selectedVisibleCount}
              totalCount={selectableIds.length}
              label="papers"
              allSelected={allSelected}
              onToggleAll={toggleAll}
              saveTarget={{
                kind: "papers-bulk",
                paperIds: Array.from(selectedIds).filter((id) => selectableIds.includes(id)),
              }}
            />
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {layout === "bento" && <BentoLayout papers={filtered} selection={selection} />}
          {layout === "organized" && <OrganizedLayout papers={filtered} selection={selection} />}
          {layout === "multistep" && <MultistepLayout papers={filtered} selection={selection} />}
          {!layout && (
            <div className="text-center py-20 text-muted-foreground">
              Pick a layout to get started ✨
            </div>
          )}
        </motion.div>
      </main>

      <LayoutChooserModal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        firstTime={!hasChosen}
      />
    </div>
  );
}

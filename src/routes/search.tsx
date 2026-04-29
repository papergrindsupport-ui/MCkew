import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore, useState, useEffect } from "react";
import { LuSearch, LuArrowLeft, LuX } from "react-icons/lu";

type SearchParams = { q: string; mode: import("@/components/smart-solve/searchEngine").SearchMode };

const VALID_MODES = ["broad", "strict", "fuzzy", "wholeWord", "strictest", "lenient"] as const;
import Navbar from "@/components/Navbar";
import { getMergedPapers } from "@/admin/merge";
import { subscribeAdminStore } from "@/admin/store";
import { getPaperQuestions } from "@/data/paperQuestions";
import {
  paperMatches,
  questionMatches,
  type SearchMode,
  SEARCH_MODE_LABELS,
} from "@/components/smart-solve/searchEngine";
import {
  QuestionResultCard,
  PaperResultCard,
  PageResultCard,
} from "@/components/smart-solve/SearchResultPreview";
import { PAGE_INDEX, matchPage } from "@/components/smart-solve/pageIndex";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — MCkew" },
      { name: "description", content: "Search questions, papers, and pages." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const rawMode = typeof search.mode === "string" ? search.mode : "broad";
    const mode = (VALID_MODES as readonly string[]).includes(rawMode)
      ? (rawMode as SearchParams["mode"])
      : "broad";
    const q = typeof search.q === "string" ? search.q : "";
    return { q, mode };
  },
  component: SearchPage,
});

function SearchPage() {
  const { q: initialQ, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [q, setQ] = useState(initialQ);
  const [mode, setMode] = useState<SearchMode>(initialMode);

  const PAPERS = useSyncExternalStore(subscribeAdminStore, getMergedPapers, getMergedPapers);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) {
      return { questions: [], papers: [], pages: [] as typeof PAGE_INDEX };
    }
    const papers = PAPERS.filter((p) => paperMatches(p, query, mode)).slice(0, 300);
    const questions: { q: any; paper: any }[] = [];
    for (const p of PAPERS) {
      const qs = getPaperQuestions(p.id);
      for (const qu of qs) {
        if (questionMatches(qu, query, mode, "everything")) {
          questions.push({ q: qu, paper: p });
          if (questions.length >= 500) break;
        }
      }
      if (questions.length >= 500) break;
    }
    const pages = PAGE_INDEX.filter((pg) => matchPage(pg, query));
    return { questions, papers, pages };
  }, [q, mode, PAPERS]);

  const commit = (nextQ: string, nextMode: SearchMode) => {
    navigate({ search: { q: nextQ, mode: nextMode }, replace: true });
  };

  const modes: SearchMode[] = ["broad", "strict", "fuzzy", "wholeWord", "strictest", "lenient"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground mb-3"
        >
          <LuArrowLeft size={12} /> Back
        </button>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Search</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit(q, mode);
          }}
          className="flex items-center gap-2 rounded-2xl border-2 border-border/60 bg-card/80 backdrop-blur p-2 shadow-sm mb-3"
        >
          <LuSearch size={16} className="ml-2 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              commit(e.target.value, mode);
            }}
            placeholder="Search questions, papers, pages…"
            className="flex-1 bg-transparent outline-none text-sm px-1"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                commit("", mode);
              }}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <LuX size={14} />
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                commit(q, m);
              }}
              className={
                "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition " +
                (mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50")
              }
            >
              {SEARCH_MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <PageSizeAndPaginatedResults q={q} results={results} />
      </main>
    </div>
  );
}

function PageSizeAndPaginatedResults({
  q,
  results,
}: {
  q: string;
  results: {
    questions: { q: any; paper: any }[];
    papers: any[];
    pages: typeof PAGE_INDEX;
  };
}) {
  const PAGE_SIZE_OPTIONS = [15, 25, 40, 50];
  const [pageSize, setPageSize] = useState<number>(25);
  const [qPage, setQPage] = useState(1);
  const [pPage, setPPage] = useState(1);
  const [pgPage, setPgPage] = useState(1);

  // Reset to page 1 when query or pageSize changes.
  const queryKey = q.trim();
  useEffect(() => {
    setQPage(1);
    setPPage(1);
    setPgPage(1);
  }, [queryKey, pageSize]);

  if (!q.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">Start typing to search.</div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span className="text-muted-foreground font-bold">Per page:</span>
        {PAGE_SIZE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPageSize(n)}
            className={
              "px-2.5 py-1 rounded-full font-bold border-2 transition cursor-pointer " +
              (pageSize === n
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/50")
            }
          >
            {n}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <PaginatedSection
          title="Questions"
          total={results.questions.length}
          page={qPage}
          pageSize={pageSize}
          setPage={setQPage}
          empty="No matching questions."
        >
          <div className="grid gap-2">
            {results.questions.slice((qPage - 1) * pageSize, qPage * pageSize).map((r) => (
              <QuestionResultCard key={r.q.id} q={r.q} paper={r.paper} query={q} />
            ))}
          </div>
        </PaginatedSection>

        <PaginatedSection
          title="Papers"
          total={results.papers.length}
          page={pPage}
          pageSize={pageSize}
          setPage={setPPage}
          empty="No matching papers."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {results.papers.slice((pPage - 1) * pageSize, pPage * pageSize).map((p) => (
              <PaperResultCard key={p.id} paper={p} query={q} />
            ))}
          </div>
        </PaginatedSection>

        <PaginatedSection
          title="Pages"
          total={results.pages.length}
          page={pgPage}
          pageSize={pageSize}
          setPage={setPgPage}
          empty="No matching pages."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {results.pages.slice((pgPage - 1) * pageSize, pgPage * pageSize).map((pg) => (
              <PageResultCard key={pg.to} page={pg} query={q} />
            ))}
          </div>
        </PaginatedSection>
      </div>
    </>
  );
}

function PaginatedSection({
  title,
  total,
  page,
  pageSize,
  setPage,
  empty,
  children,
}: {
  title: string;
  total: number;
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
  empty: string;
  children: React.ReactNode;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground">{total} results</span>
        {total > pageSize && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Page {safePage} of {totalPages}
          </span>
        )}
      </div>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <>
          {children}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-border bg-card disabled:opacity-40 hover:border-primary/60 cursor-pointer disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-bold text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-border bg-card disabled:opacity-40 hover:border-primary/60 cursor-pointer disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

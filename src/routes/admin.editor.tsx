import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuCheck,
  LuClock,
  LuFileText,
  LuSearch,
  LuRocket,
  LuFilter,
  LuLayers,
  LuCalendar,
  LuBookOpen,
  LuTag,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PAPERS,
  SUBJECTS,
  YEARS,
  SESSIONS,
  SESSION_VARIANTS,
  SUBJECT_LABEL,
  type Subject,
  type SessionKey,
  type Variant,
} from "@/data/paperData";
import { getMergedPapers } from "@/admin/merge";
import {
  getPaperDrafts,
  getPublishedPapers,
  savePaperDraft,
  deletePaperDraft,
  deletePaperEverywhere,
  unpublishPaper,
  subscribeAdminStore,
} from "@/admin/store";
import { Dropdown } from "@/admin/ui/Dropdown";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useIsAdminGate } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/admin/editor")({
  component: EditorIndex,
});

function useAdminSnapshot<T>(read: () => T): T {
  return useSyncExternalStore(subscribeAdminStore, read, read);
}

function EditorIndex() {
  const navigate = useNavigate();
  const { allowed, ready: gateReady } = useIsAdminGate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!gateReady || allowed) return;
    setCountdown(5);
    const iv = window.setInterval(() => {
      setCountdown((n) => (n > 0 ? n - 1 : 0));
    }, 1000);
    const to = window.setTimeout(() => {
      navigate({ to: "/" });
    }, 5000);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
    };
  }, [gateReady, allowed, navigate]);

  const location = useLocation();
  const drafts = useAdminSnapshot(getPaperDrafts);
  const published = useAdminSnapshot(getPublishedPapers);
  const mergedPapers = useAdminSnapshot(getMergedPapers);
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [pendingUnpublish, setPendingUnpublish] = useState<Record<string, boolean>>({});
  const [pendingDeleteEverywhere, setPendingDeleteEverywhere] = useState<Record<string, boolean>>(
    {},
  );

  const rows = useMemo(() => {
    const ids = new Set<string>();
    mergedPapers.forEach((p) => ids.add(p.id));
    Object.keys(drafts).forEach((id) => ids.add(id));
    Object.keys(published).forEach((id) => ids.add(id));
    return Array.from(ids).map((id) => {
      const merged = mergedPapers.find((p) => p.id === id);
      const builtin = PAPERS.find((p) => p.id === id);
      const draft = drafts[id];
      const pub = published[id];
      const title = draft?.title ?? pub?.title ?? merged?.title ?? id;
      const subj = (draft?.subject ?? pub?.subject ?? merged?.subject) as Subject | undefined;
      return { id, title, subject: subj, builtin: !!builtin, draft: !!draft, published: !!merged };
    });
  }, [drafts, published, mergedPapers]);

  const visible = rows
    .filter((r) => subject === "all" || r.subject === subject)
    .filter(
      (r) =>
        filter === "" ||
        r.id.toLowerCase().includes(filter.toLowerCase()) ||
        r.title.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const stats = {
    total: rows.length,
    drafts: rows.filter((r) => r.draft).length,
    published: rows.filter((r) => r.published).length,
  };

  if (!gateReady) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Checking admin access...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
        <h2 className="text-lg font-bold text-destructive">Admins Only</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is only for admins. Redirecting to homepage in {countdown} second
          {countdown === 1 ? "" : "s"}...
        </p>
      </div>
    );
  }

  if (location.pathname.replace(/\/$/, "") !== "/admin/editor") return <Outlet />;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paper Builder</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Build, edit and publish past papers. Drafts auto-save to your browser. Hit{" "}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold text-[11px]">
                <LuRocket size={10} /> Publish
              </span>{" "}
              to make changes live on Smart Solve Papers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  drafts: getPaperDrafts(),
                  published: getPublishedPapers(),
                };
                const fileContent = `export const adminEditorBackup = ${JSON.stringify(payload, null, 2)} as const;\n`;
                const blob = new Blob([fileContent], { type: "text/typescript;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "admin-editor.backup.ts";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download .ts
            </Button>
            <Button onClick={() => setShowCreate(true)} className="shadow-md">
              <LuPlus size={14} /> New paper
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat icon={LuLayers} label="All papers" value={stats.total} tone="default" />
          <Stat icon={LuClock} label="Drafts" value={stats.drafts} tone="warn" />
          <Stat icon={LuCheck} label="Published" value={stats.published} tone="ok" />
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2 flex-wrap shadow-sm">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-1">
          <LuFilter size={13} /> Filter:
        </div>
        <div className="w-44">
          <Dropdown<string>
            value={subject}
            onChange={(v) => setSubject(v as Subject | "all")}
            icon={LuBookOpen}
            options={[
              { value: "all", label: "All subjects" },
              ...SUBJECTS.map((s) => ({ value: s.key, label: s.label })),
            ]}
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <LuSearch
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-8 h-9"
            placeholder="Search by ID or title…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {visible.length} shown
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-card/50">
          No papers match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-muted-foreground truncate">{r.id}</div>
                  <h3 className="text-sm font-bold truncate">{r.title}</h3>
                </div>
                {r.subject && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase tracking-wide whitespace-nowrap">
                    {SUBJECT_LABEL[r.subject]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
                {r.builtin && (
                  <Badge tone="muted">
                    <LuFileText size={9} /> Built-in
                  </Badge>
                )}
                {r.draft && (
                  <Badge tone="warn">
                    <LuClock size={9} /> Draft
                  </Badge>
                )}
                {r.published && (
                  <Badge tone="ok">
                    <LuCheck size={9} /> Published
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                <Link
                  to="/admin/editor/$paperId"
                  params={{ paperId: r.id }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors"
                >
                  <LuPencil size={12} /> Edit
                </Link>
                {r.published && (
                  <button
                    disabled={!!pendingUnpublish[r.id]}
                    onClick={() => {
                      if (pendingUnpublish[r.id]) return;
                      if (!confirm("Unpublish this paper?")) return;
                      setPendingUnpublish((p) => ({ ...p, [r.id]: true }));
                      const t = toast.loading("Unpublishing paper...");
                      void unpublishPaper(r.id)
                        .then((res) => {
                          if (res.error)
                            toast.error(`Unpublished locally, backend error: ${res.error}`, {
                              id: t,
                            });
                          else if (res.remote) toast.success("Paper unpublished", { id: t });
                          else toast.success("Paper unpublished locally", { id: t });
                        })
                        .catch((e: unknown) => {
                          const msg =
                            (e as { error?: string })?.error || "Could not unpublish paper";
                          toast.error(msg, { id: t });
                        })
                        .finally(() => {
                          setPendingUnpublish((p) => ({ ...p, [r.id]: false }));
                        });
                    }}
                    title="Unpublish"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted text-xs disabled:opacity-50"
                  >
                    <LuRocket size={12} className="rotate-180" />
                  </button>
                )}
                {r.draft && (
                  <button
                    onClick={() => confirm("Delete draft?") && deletePaperDraft(r.id)}
                    title="Delete draft"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <LuTrash2 size={12} />
                  </button>
                )}
                {(r.published || r.draft) && (
                  <button
                    onClick={async () => {
                      if (pendingDeleteEverywhere[r.id]) return;
                      if (!confirm("Delete this paper from editor and backend?")) return;
                      setPendingDeleteEverywhere((p) => ({ ...p, [r.id]: true }));
                      const t = toast.loading("Deleting paper...");
                      try {
                        const res = await deletePaperEverywhere(r.id);
                        if (res.error)
                          toast.error(`Deleted locally, backend error: ${res.error}`, { id: t });
                        else toast.success("Paper deleted", { id: t });
                      } finally {
                        setPendingDeleteEverywhere((p) => ({ ...p, [r.id]: false }));
                      }
                    }}
                    title="Delete paper everywhere"
                    disabled={!!pendingDeleteEverywhere[r.id]}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <LuTrash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePaperModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone: "default" | "warn" | "ok";
}) {
  const cls =
    tone === "ok"
      ? "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300"
        : "from-primary/15 to-primary/5 text-primary";
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-br p-3 flex items-center gap-3",
        cls,
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-background/60 grid place-items-center">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wide font-semibold opacity-80">{label}</div>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function CreatePaperModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState<Subject>("bio");
  const [year, setYear] = useState<number>(YEARS[YEARS.length - 1]);
  const [session, setSession] = useState<SessionKey>("June");
  const [variant, setVariant] = useState<Variant>("V1");
  const id = `${subject}-${year}-${session}-${variant}`;
  const exists =
    !!getPaperDrafts()[id] || !!getPublishedPapers()[id] || !!PAPERS.find((p) => p.id === id);

  function create() {
    savePaperDraft({ id, subject, year, session, variant, title: `${year} ${session} ${variant}` });
    onClose();
    window.location.assign(`/admin/editor/${id}`);
  }
  useEffect(() => {
    if (!SESSION_VARIANTS[session].includes(variant)) setVariant(SESSION_VARIANTS[session][0]);
  }, [session, variant]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary grid place-items-center">
            <LuPlus size={16} />
          </div>
          <h2 className="text-lg font-bold">Create new paper</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Pick subject, year, session and variant. The paper ID is built automatically.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <FieldLabel icon={LuBookOpen} label="Subject">
            <Dropdown<Subject>
              value={subject}
              onChange={setSubject}
              options={SUBJECTS.map((s) => ({ value: s.key, label: s.label }))}
            />
          </FieldLabel>
          <FieldLabel icon={LuCalendar} label="Year">
            <Dropdown<number>
              value={year}
              onChange={setYear}
              options={YEARS.map((y) => ({ value: y, label: String(y) }))}
              searchable
            />
          </FieldLabel>
          <FieldLabel icon={LuTag} label="Session">
            <Dropdown<SessionKey>
              value={session}
              onChange={setSession}
              options={SESSIONS.map((s) => ({ value: s.key, label: s.label }))}
            />
          </FieldLabel>
          <FieldLabel icon={LuTag} label="Variant">
            <Dropdown<Variant>
              value={variant}
              onChange={setVariant}
              options={SESSION_VARIANTS[session].map((v) => ({ value: v, label: v }))}
            />
          </FieldLabel>
        </div>
        <p className="font-mono text-xs text-muted-foreground mb-3 px-2 py-1.5 bg-muted/50 rounded-md">
          ID: {id}
        </p>
        {exists && (
          <p className="text-xs text-amber-600 mb-2">
            A paper with this ID already exists — editing it instead.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create}>{exists ? "Edit existing" : "Create draft"}</Button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mb-1">
        <Icon size={11} /> {label}
      </div>
      {children}
    </div>
  );
}

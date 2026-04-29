// Save-to-desk modal. Used from question card menus, paper card menus,
// and the bulk selection action bar. Lets the user pick a folder, create
// a new folder, or use a sensible default with auto-created subfolders.

import { useMemo, useState } from "react";
import { LuPlus, LuChevronRight, LuFolder, LuArchive } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDeskStore, type DeskFolder } from "@/stores/useDeskStore";
import { DeskIcon } from "./iconCatalog";
import { FolderEditModal } from "./FolderEditModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type SaveTarget =
  | { kind: "question"; paperId: string; qid: string }
  | { kind: "questions-bulk"; items: { paperId: string; qid: string }[] }
  | { kind: "paper"; paperId: string }
  | { kind: "papers-bulk"; paperIds: string[] };

function defaultBuiltinFor(target: SaveTarget): "saved-questions" | "saved-papers" {
  return target.kind === "paper" || target.kind === "papers-bulk"
    ? "saved-papers"
    : "saved-questions";
}

export function SaveToDeskModal({
  open,
  onOpenChange,
  target,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  target: SaveTarget | null;
  onSaved?: (folderId: string) => void;
}) {
  const folders = useDeskStore((s) => s.folders);
  const addQuestion = useDeskStore((s) => s.addQuestion);
  const addPaper = useDeskStore((s) => s.addPaper);
  const ensureDailySubfolder = useDeskStore((s) => s.ensureDailySubfolder);
  const ensureTimedSubfolder = useDeskStore((s) => s.ensureTimedSubfolder);
  const createFolder = useDeskStore((s) => s.createFolder);

  const [parentId, setParentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | "default" | null>("default");
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const visibleFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parentId === parentId && (showArchived || !f.archived))
        .sort((a, b) => (a.builtin ? -1 : b.builtin ? 1 : a.order - b.order)),
    [folders, parentId, showArchived],
  );

  const breadcrumb = useMemo(() => {
    const chain: DeskFolder[] = [];
    let cur = parentId;
    while (cur) {
      const f = folders.find((x) => x.id === cur);
      if (!f) break;
      chain.unshift(f);
      cur = f.parentId;
    }
    return chain;
  }, [folders, parentId]);

  const builtinKey = target ? defaultBuiltinFor(target) : null;
  const defaultFolder = folders.find((f) => f.builtin === builtinKey);

  const handleSave = () => {
    if (!target) return;
    let destFolderId: string | null = null;

    if (selected === "default" && defaultFolder) {
      // Build the auto-subfolder per the rules.
      if (target.kind === "question") {
        destFolderId = ensureDailySubfolder(defaultFolder.id);
      } else if (target.kind === "paper") {
        destFolderId = ensureDailySubfolder(defaultFolder.id);
      } else {
        // bulk – create a timed subfolder so all bulk items live together
        destFolderId = ensureTimedSubfolder(defaultFolder.id);
      }
    } else if (selected && selected !== "default") {
      // User picked a specific folder. For bulk save, also create a timed
      // sub-bucket inside the chosen folder per the spec.
      if (target.kind === "questions-bulk" || target.kind === "papers-bulk") {
        destFolderId = ensureTimedSubfolder(selected);
      } else {
        destFolderId = selected;
      }
    } else {
      toast.error("Pick a folder first");
      return;
    }

    let count = 0;
    if (target.kind === "question") {
      addQuestion(destFolderId, target.paperId, target.qid);
      count = 1;
    } else if (target.kind === "paper") {
      addPaper(destFolderId, target.paperId);
      count = 1;
    } else if (target.kind === "questions-bulk") {
      for (const it of target.items) {
        addQuestion(destFolderId, it.paperId, it.qid);
      }
      count = target.items.length;
    } else if (target.kind === "papers-bulk") {
      for (const id of target.paperIds) addPaper(destFolderId, id);
      count = target.paperIds.length;
    }

    const folder = folders.find((f) => f.id === destFolderId);
    toast.success(
      `Saved ${count} ${count === 1 ? "item" : "items"} to ${folder?.name ?? "your desk"}`,
    );
    onSaved?.(destFolderId!);
    onOpenChange(false);
    setSelected("default");
    setParentId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save to desk</DialogTitle>
            <DialogDescription>
              Pick a folder, create a new one, or use the default —{" "}
              <span className="font-bold">{defaultFolder?.name ?? "Saved"}</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            <button
              type="button"
              onClick={() => setParentId(null)}
              className="font-bold hover:text-primary"
            >
              Root
            </button>
            {breadcrumb.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1">
                <LuChevronRight size={12} />
                <button
                  type="button"
                  onClick={() => setParentId(f.id)}
                  className="font-bold hover:text-primary"
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          {/* Default option */}
          <button
            type="button"
            onClick={() => setSelected("default")}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl border-2 px-3 py-2.5 text-left transition",
              selected === "default"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
            )}
          >
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: `hsl(${defaultFolder?.color ?? "215 90% 60%"})` }}
            >
              <DeskIcon name={defaultFolder?.icon ?? "Folder"} size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">
                Default · {defaultFolder?.name ?? "Saved"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {target?.kind === "questions-bulk" || target?.kind === "papers-bulk"
                  ? "Auto-creates a timed subfolder so this batch stays together."
                  : "Auto-creates today's subfolder for you."}
              </div>
            </div>
          </button>

          {/* Folder list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-muted-foreground px-1">
              <span>Folders here</span>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-primary"
                title={showArchived ? "Hide archived" : "Show archived"}
              >
                <LuArchive size={11} /> {showArchived ? "Hide archived" : "Show archived"}
              </button>
            </div>
            {visibleFolders.length === 0 && (
              <div className="text-xs text-muted-foreground py-3 text-center">
                No folders here yet.
              </div>
            )}
            {visibleFolders.map((f) => {
              const childCount = folders.filter((c) => c.parentId === f.id).length;
              const isSelected = selected === f.id;
              return (
                <div key={f.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(f.id)}
                    className={cn(
                      "flex items-center gap-2.5 flex-1 rounded-lg border-2 px-2.5 py-2 text-left transition min-w-0",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      f.archived && "opacity-60",
                    )}
                  >
                    <div
                      className="h-7 w-7 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: `hsl(${f.color})` }}
                    >
                      <DeskIcon name={f.icon} size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{f.name}</div>
                      {f.description && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {f.description}
                        </div>
                      )}
                    </div>
                    {f.archived && (
                      <span className="text-[10px] font-bold text-muted-foreground">archived</span>
                    )}
                  </button>
                  {childCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setParentId(f.id);
                        setSelected(null);
                      }}
                      title="Open folder"
                      className="px-2 rounded-lg border-2 border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition"
                    >
                      <LuChevronRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:text-primary text-sm font-bold py-2 transition"
          >
            <LuPlus size={14} /> New folder here
          </button>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold border-2 border-border hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selected}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              <LuFolder size={14} /> Save here
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FolderEditModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New folder"
        initial={{ name: "", description: "", icon: "Folder", color: "215 90% 60%" }}
        onSave={(v) => {
          const id = createFolder({ ...v, parentId });
          setSelected(id);
        }}
      />
    </>
  );
}

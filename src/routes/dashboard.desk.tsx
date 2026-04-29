import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  LuArchive,
  LuArchiveRestore,
  LuChevronRight,
  LuFolderPlus,
  LuLayoutGrid,
  LuList,
  LuMessageSquare,
  LuPencil,
  LuStickyNote,
  LuTrash2,
  LuFlag,
  LuArrowLeft,
  LuLayoutDashboard,
} from "react-icons/lu";
import Navbar from "@/components/Navbar";
import { useDeskStore, FOLDER_FLAG_COLORS, type DeskFolder } from "@/stores/useDeskStore";
import { DeskIcon } from "@/components/desk/iconCatalog";
import { FolderEditModal } from "@/components/desk/FolderEditModal";
import { FolderCard, ItemCard } from "@/components/desk/DeskCards";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/desk")({
  head: () => ({
    meta: [
      { title: "Desk — MCkew" },
      {
        name: "description",
        content: "Your personal desk: folders, notes, saved papers and questions.",
      },
    ],
  }),
  component: DeskPage,
});

function DeskPage() {
  const folders = useDeskStore((s) => s.folders);
  const items = useDeskStore((s) => s.items);
  const createFolder = useDeskStore((s) => s.createFolder);
  const updateFolder = useDeskStore((s) => s.updateFolder);
  const archiveFolder = useDeskStore((s) => s.archiveFolder);
  const deleteFolder = useDeskStore((s) => s.deleteFolder);
  const moveFolder = useDeskStore((s) => s.moveFolder);
  const moveItem = useDeskStore((s) => s.moveItem);
  const addNote = useDeskStore((s) => s.addNote);
  const addFolderComment = useDeskStore((s) => s.addFolderComment);
  const deleteFolderComment = useDeskStore((s) => s.deleteFolderComment);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<DeskFolder | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const currentFolder = parentId ? folders.find((f) => f.id === parentId) : null;

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

  const visibleFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parentId === parentId && (showArchived || !f.archived))
        .sort((a, b) => {
          // builtins first at root
          if (a.builtin && !b.builtin) return -1;
          if (!a.builtin && b.builtin) return 1;
          return a.order - b.order;
        }),
    [folders, parentId, showArchived],
  );

  const visibleItems = useMemo(
    () => items.filter((i) => i.folderId === parentId).sort((a, b) => a.order - b.order),
    [items, parentId],
  );

  const reorderFolders = useDeskStore((s) => s.reorderFolders);
  const reorderItems = useDeskStore((s) => s.reorderItems);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const folderSortIds = useMemo(
    () => visibleFolders.map((f) => `folder:${f.id}`),
    [visibleFolders],
  );
  const itemSortIds = useMemo(() => visibleItems.map((i) => `item:${i.id}`), [visibleItems]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current as
      | { kind: "folder" | "item"; id: string; parentId?: string | null; folderId?: string | null }
      | undefined;
    const overData = over.data.current as
      | {
          kind: "folder" | "item" | "into-folder" | "root-drop";
          id?: string;
          folderId?: string | null;
        }
      | undefined;
    if (!activeData) return;

    // Drop INTO a folder card → move active under that folder.
    if (overData?.kind === "into-folder" && overData.folderId) {
      if (activeData.kind === "folder") {
        if (activeData.id === overData.folderId) return;
        moveFolder(activeData.id, overData.folderId);
        toast.success("Moved into folder");
      } else {
        moveItem(activeData.id, overData.folderId);
        toast.success("Moved into folder");
      }
      return;
    }

    // Drop on the breadcrumb root area → move to current parent.
    if (overData?.kind === "root-drop") {
      if (activeData.kind === "folder") moveFolder(activeData.id, parentId);
      else moveItem(activeData.id, parentId);
      toast.success("Moved here");
      return;
    }

    // Reorder within the same list.
    if (active.id === over.id) return;
    if (activeData.kind === "folder" && overData?.kind === "folder") {
      const oldIndex = folderSortIds.indexOf(String(active.id));
      const newIndex = folderSortIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(folderSortIds, oldIndex, newIndex).map((s) =>
        s.replace(/^folder:/, ""),
      );
      reorderFolders(parentId, next);
      return;
    }
    if (activeData.kind === "item" && overData?.kind === "item") {
      const oldIndex = itemSortIds.indexOf(String(active.id));
      const newIndex = itemSortIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(itemSortIds, oldIndex, newIndex).map((s) => s.replace(/^item:/, ""));
      reorderItems(parentId, next);
      return;
    }
  };

  const handleAddNote = () => {
    addNote(parentId, "New note", "");
    toast.success("Note added");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
                <LuLayoutDashboard /> Dashboard · Desk
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mt-1">Your Desk</h1>
              <p className="text-sm text-muted-foreground">
                Organize folders, notes, saved questions and saved papers.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border-2 border-border hover:border-primary/40 transition"
              >
                <LuArrowLeft size={12} /> Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border-2 transition",
                  showArchived
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40",
                )}
                title={showArchived ? "Hide archived" : "Show archived"}
              >
                {showArchived ? <LuArchiveRestore size={12} /> : <LuArchive size={12} />}
                {showArchived ? "Hide archived" : "Show archived"}
              </button>
              <div className="inline-flex rounded-full border-2 border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "px-3 py-2 text-xs font-bold inline-flex items-center gap-1",
                    view === "grid" && "bg-primary text-primary-foreground",
                  )}
                >
                  <LuLayoutGrid size={12} /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "px-3 py-2 text-xs font-bold inline-flex items-center gap-1",
                    view === "list" && "bg-primary text-primary-foreground",
                  )}
                >
                  <LuList size={12} /> List
                </button>
              </div>
            </div>
          </motion.header>

          {/* Breadcrumbs (also a drop target — drop here to move to current parent) */}
          <BreadcrumbDrop
            breadcrumb={breadcrumb}
            onGoRoot={() => setParentId(null)}
            onGoFolder={(id) => setParentId(id)}
          />

          {/* Current folder header (when inside a folder) */}
          {currentFolder && (
            <div
              className="rounded-2xl border-2 border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ borderLeftColor: `hsl(${currentFolder.color})`, borderLeftWidth: 5 }}
            >
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: `hsl(${currentFolder.color})` }}
              >
                <DeskIcon name={currentFolder.icon} size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold truncate">{currentFolder.name}</h2>
                  {currentFolder.archived && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded">
                      archived
                    </span>
                  )}
                  {currentFolder.flag && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: `hsl(${FOLDER_FLAG_COLORS[currentFolder.flag]})` }}
                    >
                      <LuFlag size={10} /> {currentFolder.flag}
                    </span>
                  )}
                </div>
                {currentFolder.description && (
                  <p className="text-sm text-muted-foreground mt-1">{currentFolder.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditFolder(currentFolder)}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                >
                  <LuPencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setCommentsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                >
                  <LuMessageSquare size={12} /> Comments · {currentFolder.comments.length}
                </button>
                <button
                  type="button"
                  onClick={() => archiveFolder(currentFolder.id, !currentFolder.archived)}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                >
                  {currentFolder.archived ? (
                    <LuArchiveRestore size={12} />
                  ) : (
                    <LuArchive size={12} />
                  )}
                  {currentFolder.archived ? "Unarchive" : "Archive"}
                </button>
                {!currentFolder.builtin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${currentFolder.name}" and everything inside?`)) {
                        deleteFolder(currentFolder.id);
                        setParentId(currentFolder.parentId);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-destructive/40 text-destructive px-3 py-1.5 text-xs font-bold hover:bg-destructive/10"
                  >
                    <LuTrash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              <LuFolderPlus size={14} /> New folder
            </button>
            <button
              type="button"
              onClick={handleAddNote}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition"
            >
              <LuStickyNote size={14} /> Add note
            </button>
            <span className="text-xs text-muted-foreground ml-auto">
              Drag folders/items to move them. Drop on a folder to put inside, or on the breadcrumb
              area to drop here.
            </span>
          </div>

          {/* Folders */}
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Folders · {visibleFolders.length}
            </h3>
            {visibleFolders.length === 0 ? (
              <div className="text-sm text-muted-foreground italic px-1">No folders here yet.</div>
            ) : (
              <SortableContext
                items={folderSortIds}
                strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "gap-3",
                    view === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "flex flex-col",
                  )}
                >
                  {visibleFolders.map((f) => (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      view={view}
                      onOpen={() => setParentId(f.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>

          {/* Items */}
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Items · {visibleItems.length}
            </h3>
            {visibleItems.length === 0 ? (
              <div className="text-sm text-muted-foreground italic px-1">
                No items here yet. Save questions or papers from anywhere in the app, or add a note.
              </div>
            ) : (
              <SortableContext
                items={itemSortIds}
                strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "gap-3",
                    view === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col",
                  )}
                >
                  {visibleItems.map((it) => (
                    <ItemCard key={it.id} item={it} view={view} />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>
        </main>
      </DndContext>

      <FolderEditModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New folder"
        initial={{ name: "", description: "", icon: "Folder", color: "215 90% 60%" }}
        onSave={(v) => {
          createFolder({ ...v, parentId });
          toast.success("Folder created");
        }}
      />

      {editFolder && (
        <FolderEditModal
          open={!!editFolder}
          onOpenChange={(o) => !o && setEditFolder(null)}
          title="Edit folder"
          initial={{
            name: editFolder.name,
            description: editFolder.description,
            icon: editFolder.icon,
            color: editFolder.color,
          }}
          onSave={(v) => {
            updateFolder(editFolder.id, v);
            setEditFolder(null);
          }}
        />
      )}

      <AnimatePresence>
        {commentsOpen && currentFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
            onClick={() => setCommentsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border-2 border-border rounded-2xl p-4 max-w-md w-full shadow-xl flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold">Comments · {currentFolder.name}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentFolder.comments.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    No comments yet. Add the first one below.
                  </div>
                )}
                {currentFolder.comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="text-sm whitespace-pre-wrap break-words">{c.body}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(c.at).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteFolderComment(currentFolder.id, c.id)}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={3}
                placeholder="Add a comment…"
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCommentsOpen(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-border hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (commentDraft.trim()) {
                      addFolderComment(currentFolder.id, commentDraft);
                      setCommentDraft("");
                      toast.success("Comment added");
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground"
                >
                  Add comment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BreadcrumbDrop({
  breadcrumb,
  onGoRoot,
  onGoFolder,
}: {
  breadcrumb: DeskFolder[];
  onGoRoot: () => void;
  onGoFolder: (id: string) => void;
}) {
  const drop = useDroppable({ id: "desk-root-drop", data: { kind: "root-drop" } });
  return (
    <div
      ref={drop.setNodeRef}
      className={cn(
        "flex items-center gap-1 text-sm flex-wrap p-2 rounded-xl border-2 border-dashed transition",
        drop.isOver ? "border-primary bg-primary/10" : "border-transparent",
      )}
    >
      <button
        type="button"
        onClick={onGoRoot}
        className="font-bold text-foreground hover:text-primary"
      >
        Root
      </button>
      {breadcrumb.map((f) => (
        <span key={f.id} className="inline-flex items-center gap-1 min-w-0">
          <LuChevronRight size={14} className="text-muted-foreground shrink-0" />
          <button
            type="button"
            onClick={() => onGoFolder(f.id)}
            className="font-bold text-foreground hover:text-primary truncate max-w-[180px]"
          >
            {f.name}
          </button>
        </span>
      ))}
    </div>
  );
}

// Folder/item card components used by the desk page.
// Cards are dnd-kit Sortable so they can be reordered AND dropped onto folders.

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  LuEllipsis,
  LuPencil,
  LuArchive,
  LuArchiveRestore,
  LuTrash2,
  LuFlag,
  LuMessageSquarePlus,
  LuStickyNote,
  LuFileText,
  LuClipboardList,
  LuExternalLink,
  LuGripVertical,
  LuPlay,
} from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  useDeskStore,
  type DeskFolder,
  type DeskItem,
  FOLDER_FLAG_COLORS,
} from "@/stores/useDeskStore";
import { DeskIcon } from "@/components/desk/iconCatalog";
import { FolderEditModal } from "@/components/desk/FolderEditModal";
import { SingleQuestionPlayModal } from "@/components/SingleQuestionPlayModal";
import { cn } from "@/lib/utils";
import { getMergedPaperById } from "@/admin/merge";
import { getPaperById } from "@/data/paperData";
import { getPaperQuestions } from "@/data/paperQuestions";

/** A small drop-line that appears above/below sortable cards while dragging. */
function DropIndicator({ side, active }: { side: "top" | "bottom"; active: boolean }) {
  if (!active) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 z-20 flex items-center",
        side === "top" ? "-top-[6px]" : "-bottom-[6px]",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary -mr-0.5" />
      <span className="flex-1 h-0.5 rounded-full bg-primary" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary -ml-0.5" />
    </div>
  );
}

export function FolderCard({
  folder,
  view,
  onOpen,
}: {
  folder: DeskFolder;
  view: "grid" | "list";
  onOpen: () => void;
}) {
  const folders = useDeskStore((s) => s.folders);
  const items = useDeskStore((s) => s.items);
  const updateFolder = useDeskStore((s) => s.updateFolder);
  const archiveFolder = useDeskStore((s) => s.archiveFolder);
  const deleteFolder = useDeskStore((s) => s.deleteFolder);
  const addFolderComment = useDeskStore((s) => s.addFolderComment);
  const [editOpen, setEditOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Sortable for reordering at the same level. Builtins can't move.
  const sortable = useSortable({
    id: `folder:${folder.id}`,
    data: { kind: "folder", id: folder.id, parentId: folder.parentId },
    disabled: !!folder.builtin,
  });

  // Separate droppable so OTHER cards (folders/items) can be dropped INTO this folder.
  const intoDroppable = useDroppable({
    id: `into-folder:${folder.id}`,
    data: { kind: "into-folder", folderId: folder.id },
  });

  const childCount =
    folders.filter((f) => f.parentId === folder.id).length +
    items.filter((i) => i.folderId === folder.id).length;

  const sortableStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };

  const isOver = sortable.isOver;
  const activeTranslated = sortable.active?.rect.current.translated;
  const overSide: "top" | "bottom" | null =
    isOver && sortable.over?.id !== sortable.active?.id
      ? sortable.over?.rect && activeTranslated
        ? activeTranslated.top < sortable.over.rect.top
          ? "top"
          : "bottom"
        : null
      : null;

  const setWrapperRef = (node: HTMLElement | null) => {
    sortable.setNodeRef(node);
    intoDroppable.setNodeRef(node);
  };
  const wrapperStyle = {
    ...sortableStyle,
    borderLeftColor: `hsl(${folder.color})`,
    borderLeftWidth: 4,
  };
  const wrapperClassBase = cn(
    "relative group rounded-2xl border-2 bg-card transition cursor-pointer overflow-visible hover:-translate-y-0.5",
    intoDroppable.isOver
      ? "border-primary ring-2 ring-primary/40 scale-[1.02]"
      : "border-border/60 hover:border-primary/40",
    folder.archived && "opacity-60",
    sortable.isDragging && "opacity-40",
  );

  const flagDot = folder.flag && (
    <span
      className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-background"
      style={{ backgroundColor: `hsl(${FOLDER_FLAG_COLORS[folder.flag]})` }}
      title={`Flagged ${folder.flag}`}
    />
  );

  const dragHandle = !folder.builtin && (
    <button
      type="button"
      aria-label="Drag to reorder or move"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition"
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <LuGripVertical size={14} />
    </button>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Folder menu"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-background/80 hover:border-primary/60 hover:text-primary transition opacity-0 group-hover:opacity-100"
        >
          <LuEllipsis size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => setEditOpen(true)} className="text-xs">
          <LuPencil size={12} /> Edit folder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setCommentOpen(true)} className="text-xs">
          <LuMessageSquarePlus size={12} /> Add comment
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <LuFlag size={12} /> Flag
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() => updateFolder(folder.id, { flag: "" })}
              className="text-xs"
            >
              No flag
            </DropdownMenuItem>
            {(Object.keys(FOLDER_FLAG_COLORS) as Array<keyof typeof FOLDER_FLAG_COLORS>).map(
              (k) => (
                <DropdownMenuItem
                  key={k}
                  onSelect={() => updateFolder(folder.id, { flag: k })}
                  className="text-xs capitalize"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: `hsl(${FOLDER_FLAG_COLORS[k]})` }}
                  />
                  {k}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => archiveFolder(folder.id, !folder.archived)}
          className="text-xs"
        >
          {folder.archived ? <LuArchiveRestore size={12} /> : <LuArchive size={12} />}
          {folder.archived ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        {!folder.builtin && (
          <DropdownMenuItem
            onSelect={() => {
              if (confirm(`Delete "${folder.name}" and everything inside?`)) {
                deleteFolder(folder.id);
              }
            }}
            className="text-xs text-destructive focus:text-destructive"
          >
            <LuTrash2 size={12} /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const editor = (
    <>
      <FolderEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit folder"
        initial={{
          name: folder.name,
          description: folder.description,
          icon: folder.icon,
          color: folder.color,
        }}
        onSave={(v) => updateFolder(folder.id, v)}
      />
      {commentOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setCommentOpen(false)}
        >
          <div
            className="bg-card border-2 border-border rounded-2xl p-4 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm mb-2">Add comment to {folder.name}</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Your thoughts…"
              className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={() => setCommentOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (commentText.trim()) {
                    addFolderComment(folder.id, commentText);
                    setCommentText("");
                  }
                  setCommentOpen(false);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground"
              >
                Add comment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (view === "list") {
    return (
      <div ref={setWrapperRef} style={wrapperStyle} className={cn(wrapperClassBase, "px-3 py-2.5")}>
        <DropIndicator side="top" active={overSide === "top"} />
        <DropIndicator side="bottom" active={overSide === "bottom"} />
        <div className="flex items-center gap-2" onClick={onOpen}>
          {dragHandle}
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: `hsl(${folder.color})` }}
          >
            <DeskIcon name={folder.icon} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold truncate">{folder.name}</div>
              {folder.archived && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  archived
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {childCount} item{childCount === 1 ? "" : "s"}
              {folder.description ? ` · ${folder.description}` : ""}
            </div>
          </div>
          {flagDot}
          <div className="ml-auto">{menu}</div>
        </div>
        {editor}
      </div>
    );
  }

  return (
    <div
      ref={setWrapperRef}
      style={wrapperStyle}
      className={cn(wrapperClassBase, "p-4 flex flex-col gap-3")}
    >
      <DropIndicator side="top" active={overSide === "top"} />
      <DropIndicator side="bottom" active={overSide === "bottom"} />
      <div className="absolute top-2 left-2 z-10">{dragHandle}</div>
      <div onClick={onOpen} className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: `hsl(${folder.color})` }}
          >
            <DeskIcon name={folder.icon} size={22} />
          </div>
          {flagDot}
        </div>
        <div className="min-w-0">
          <div className="font-bold truncate">{folder.name}</div>
          {folder.description && (
            <div className="text-[11px] text-muted-foreground line-clamp-2">
              {folder.description}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1">
            {childCount} item{childCount === 1 ? "" : "s"}
            {folder.archived ? " · archived" : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end">{menu}</div>
      {editor}
    </div>
  );
}

export function ItemCard({ item, view }: { item: DeskItem; view: "grid" | "list" }) {
  const deleteItem = useDeskStore((s) => s.deleteItem);
  const updateNote = useDeskStore((s) => s.updateNote);
  const [editingNote, setEditingNote] = useState(false);
  const [playQuestion, setPlayQuestion] = useState<
    ReturnType<typeof getPaperQuestions>[number] | null
  >(null);
  const [noteTitle, setNoteTitle] = useState(item.type === "note" ? item.title : "");
  const [noteBody, setNoteBody] = useState(item.type === "note" ? item.body : "");

  const sortable = useSortable({
    id: `item:${item.id}`,
    data: { kind: "item", id: item.id, folderId: item.folderId },
  });
  const sortableStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };
  const itemActiveTranslated = sortable.active?.rect.current.translated;
  const overSide: "top" | "bottom" | null =
    sortable.isOver && sortable.over?.id !== sortable.active?.id
      ? sortable.over?.rect && itemActiveTranslated
        ? itemActiveTranslated.top < sortable.over.rect.top
          ? "top"
          : "bottom"
        : null
      : null;

  let icon: React.ReactNode;
  let title = "";
  let subtitle = "";
  let onClick: (() => void) | undefined;
  let linkTo: { to: string; params?: Record<string, string> } | null = null;
  let kindBadge: string | null = null;

  if (item.type === "note") {
    icon = <LuStickyNote size={16} />;
    title = item.title;
    subtitle = item.body || "Empty note";
    onClick = () => setEditingNote(true);
  } else if (item.type === "paper") {
    const p = getMergedPaperById(item.paperId) ?? getPaperById(item.paperId);
    icon = <LuFileText size={16} />;
    title = p?.title ?? item.paperId;
    subtitle = p ? `${p.subject.toUpperCase()} · saved paper` : "Saved paper";
    linkTo = { to: "/smart-solve-papers/$paperId", params: { paperId: item.paperId } };
    kindBadge = "Paper";
  } else {
    const p = getMergedPaperById(item.paperId) ?? getPaperById(item.paperId);
    const qs = getPaperQuestions(item.paperId);
    const q = qs.find((x) => x.id === item.qid);
    icon = <LuClipboardList size={16} />;
    title = q ? `Q${q.number} · ${p?.title ?? item.paperId}` : item.qid;
    subtitle = "Saved question · click to play";
    onClick = () => {
      if (q) setPlayQuestion(q);
    };
    kindBadge = "Question";
  }

  const dragHandle = (
    <button
      type="button"
      aria-label="Drag to reorder or move"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition"
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <LuGripVertical size={14} />
    </button>
  );

  const noteEditor = item.type === "note" && editingNote && (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
      onClick={() => setEditingNote(false)}
    >
      <div
        className="bg-card border-2 border-border rounded-2xl p-4 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-sm mb-2">Edit note</h3>
        <input
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary/60 mb-2"
        />
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={6}
          placeholder="Write something…"
          className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
        />
        <div className="flex gap-2 mt-3 justify-end">
          <button
            type="button"
            onClick={() => setEditingNote(false)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-border hover:bg-muted"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              updateNote(item.id, { title: noteTitle, body: noteBody });
              setEditingNote(false);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Item menu"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-background/80 hover:border-primary/60 hover:text-primary transition opacity-0 group-hover:opacity-100"
        >
          <LuEllipsis size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {item.type === "note" && (
          <DropdownMenuItem onSelect={() => setEditingNote(true)} className="text-xs">
            <LuPencil size={12} /> Edit note
          </DropdownMenuItem>
        )}
        {item.type === "question" && (
          <DropdownMenuItem onSelect={() => onClick?.()} className="text-xs">
            <LuPlay size={12} /> Play
          </DropdownMenuItem>
        )}
        {linkTo && (
          <DropdownMenuItem asChild className="text-xs">
            <Link to={linkTo.to} params={linkTo.params} className="cursor-pointer">
              <LuExternalLink size={12} /> Open
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            if (confirm("Remove this item from your desk?")) deleteItem(item.id);
          }}
          className="text-xs text-destructive focus:text-destructive"
        >
          <LuTrash2 size={12} /> Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const inner = (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {dragHandle}
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="text-sm font-bold truncate">{title}</div>
          {kindBadge && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {kindBadge}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
      </div>
      {menu}
    </div>
  );

  const wrapperClass = cn(
    "relative group rounded-2xl border-2 border-border/60 bg-card hover:border-primary/40 transition cursor-pointer",
    view === "list" ? "px-3 py-2.5" : "p-3",
    sortable.isDragging && "opacity-40",
  );

  // Saved papers route via Link; questions and notes use modal/click handlers.
  if (linkTo) {
    return (
      <>
        <div ref={sortable.setNodeRef} style={sortableStyle} className="relative">
          <DropIndicator side="top" active={overSide === "top"} />
          <DropIndicator side="bottom" active={overSide === "bottom"} />
          <Link to={linkTo.to} params={linkTo.params} className={wrapperClass}>
            {inner}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div ref={sortable.setNodeRef} style={sortableStyle} className="relative">
        <DropIndicator side="top" active={overSide === "top"} />
        <DropIndicator side="bottom" active={overSide === "bottom"} />
        <div onClick={onClick} className={wrapperClass}>
          {inner}
        </div>
      </div>
      {noteEditor}
      {playQuestion && (
        <SingleQuestionPlayModal question={playQuestion} onClose={() => setPlayQuestion(null)} />
      )}
    </>
  );
}

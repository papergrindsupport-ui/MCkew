// Annotation UI for questions: bookmarks, tags, comments.
// Used across smart-solve modes and the standard paper page.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuBookmark,
  LuMessageSquare,
  LuTag,
  LuTrash2,
  LuPlus,
  LuPencil,
  LuChevronDown,
  LuX,
} from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/admin/RichTextEditor";
import { RichTextView } from "./RichTextView";
import {
  useAnnotationsStore,
  qkey,
  type Comment,
  type QuestionTagDef,
} from "./useAnnotationsStore";
import type { RichText } from "@/data/questionData";

const EMPTY_COMMENTS: Comment[] = [];
const EMPTY_TAG_IDS: string[] = [];

/* ─────────── Bookmark button ─────────── */

export function BookmarkButton({
  paperId,
  qid,
  className,
  size = 14,
}: {
  paperId: string;
  qid: string;
  className?: string;
  size?: number;
}) {
  const k = qkey(paperId, qid);
  const isMarked = useAnnotationsStore((s) => !!s.bookmarks[k]);
  const toggle = useAnnotationsStore((s) => s.toggleBookmark);
  return (
    <button
      type="button"
      aria-label={isMarked ? "Remove bookmark" : "Mark for review"}
      title={isMarked ? "Remove bookmark" : "Mark for review"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(k);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition",
        isMarked
          ? "bg-yellow-400/20 border-yellow-500/60 text-yellow-600 dark:text-yellow-400"
          : "border-border/50 text-muted-foreground hover:border-yellow-500/50 hover:text-yellow-500",
        className ?? "w-8 h-8",
      )}
    >
      <LuBookmark size={size} fill={isMarked ? "currentColor" : "none"} />
    </button>
  );
}

/* ─────────── Comment dialog (WYSIWYG) ─────────── */

export function CommentDialog({
  open,
  onOpenChange,
  paperId,
  qid,
  editId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  paperId: string;
  qid: string;
  editId?: string;
}) {
  const k = qkey(paperId, qid);
  const existing = useAnnotationsStore((s) => s.comments[k]) ?? EMPTY_COMMENTS;
  const addComment = useAnnotationsStore((s) => s.addComment);
  const updateComment = useAnnotationsStore((s) => s.updateComment);

  const editing = editId ? existing.find((c) => c.id === editId) : null;
  const [body, setBody] = useState<RichText>(editing?.body ?? []);

  useEffect(() => {
    if (open) setBody(editing?.body ?? []);
  }, [open, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (body.length === 0) return;
    if (editing) updateComment(k, editing.id, body);
    else addComment(k, body);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit comment" : "Add comment"}</DialogTitle>
          <DialogDescription>
            Saved locally to this browser. Use the toolbar for formatting and math.
          </DialogDescription>
        </DialogHeader>
        <RichTextEditor value={body} onChange={setBody} placeholder="Write your note…" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? "Save" : "Add comment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Comments section (collapsible) ─────────── */

export function CommentsSection({ paperId, qid }: { paperId: string; qid: string }) {
  const k = qkey(paperId, qid);
  const comments = useAnnotationsStore((s) => s.comments[k]) ?? EMPTY_COMMENTS;
  const deleteComment = useAnnotationsStore((s) => s.deleteComment);
  const [open, setOpen] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  if (comments.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border-2 border-border/40 bg-background/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30"
      >
        <LuMessageSquare size={12} />
        {comments.length} comment{comments.length === 1 ? "" : "s"}
        <LuChevronDown size={12} className={cn("ml-auto transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border/40 bg-card/60 p-3">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                    {new Date(c.createdAt).toLocaleString()}
                    <button
                      type="button"
                      onClick={() => setEditId(c.id)}
                      className="ml-auto p-1 rounded hover:bg-muted"
                      title="Edit"
                    >
                      <LuPencil size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteComment(k, c.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title="Delete"
                    >
                      <LuTrash2 size={10} />
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <RichTextView rich={c.body} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {editId && (
        <CommentDialog
          open={!!editId}
          onOpenChange={(o) => {
            if (!o) setEditId(null);
          }}
          paperId={paperId}
          qid={qid}
          editId={editId}
        />
      )}
    </section>
  );
}

/* ─────────── Tags bar + picker ─────────── */

export function TagsBar({ paperId, qid }: { paperId: string; qid: string }) {
  const k = qkey(paperId, qid);
  const library = useAnnotationsStore((s) => s.tagLibrary);
  const tagIds = useAnnotationsStore((s) => s.tagsByQ[k]) ?? EMPTY_TAG_IDS;
  const removeTag = useAnnotationsStore((s) => s.removeTagFromQ);
  const tags = useMemo(
    () => tagIds.map((id) => library.find((t) => t.id === id)).filter(Boolean) as QuestionTagDef[],
    [tagIds, library],
  );
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
          style={{
            backgroundColor: `${t.color}22`,
            color: t.color,
            borderColor: `${t.color}66`,
          }}
        >
          <LuTag size={9} /> {t.label}
          <button
            type="button"
            onClick={() => removeTag(k, t.id)}
            className="ml-0.5 hover:opacity-70"
            aria-label={`Remove ${t.label}`}
          >
            <LuX size={9} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function TagPicker({
  paperId,
  qid,
  trigger,
}: {
  paperId: string;
  qid: string;
  trigger?: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border border-dashed border-border/60 text-muted-foreground hover:border-primary/60 hover:text-primary"
          >
            <LuTag size={10} /> Add tag
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <TagPickerBody paperId={paperId} qid={qid} />
      </PopoverContent>
    </Popover>
  );
}

/** Same UI as TagPicker but rendered inside a Dialog — used from menu actions. */
export function TagsDialog({
  open,
  onOpenChange,
  paperId,
  qid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  paperId: string;
  qid: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription>
            Toggle, create, or delete tags. Saved locally to this browser.
          </DialogDescription>
        </DialogHeader>
        <TagPickerBody paperId={paperId} qid={qid} />
      </DialogContent>
    </Dialog>
  );
}

function TagPickerBody({ paperId, qid }: { paperId: string; qid: string }) {
  const k = qkey(paperId, qid);
  const library = useAnnotationsStore((s) => s.tagLibrary);
  const tagIds = useAnnotationsStore((s) => s.tagsByQ[k]) ?? EMPTY_TAG_IDS;
  const addTag = useAnnotationsStore((s) => s.addTagToQ);
  const removeTag = useAnnotationsStore((s) => s.removeTagFromQ);
  const createTag = useAnnotationsStore((s) => s.createTag);
  const deleteTag = useAnnotationsStore((s) => s.deleteTag);

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const create = () => {
    if (!newLabel.trim()) return;
    const t = createTag(newLabel.trim(), newColor);
    addTag(k, t.id);
    setNewLabel("");
  };

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Tags
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
        {library.map((t) => {
          const on = tagIds.includes(t.id);
          return (
            <span key={t.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => (on ? removeTag(k, t.id) : addTag(k, t.id))}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition",
                  on ? "" : "opacity-60 hover:opacity-100",
                )}
                style={{
                  backgroundColor: on ? `${t.color}22` : "transparent",
                  color: t.color,
                  borderColor: `${t.color}66`,
                }}
              >
                <LuTag size={9} /> {t.label}
              </button>
              {!t.builtin && (
                <button
                  type="button"
                  onClick={() => deleteTag(t.id)}
                  className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 text-destructive"
                  title="Delete tag"
                >
                  <LuX size={9} />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className="border-t border-border/40 pt-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          New tag
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-7 h-7 rounded border border-border/60 cursor-pointer bg-transparent"
            aria-label="Tag color"
          />
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            placeholder="Label…"
            className="h-7 text-xs"
          />
          <Button size="sm" onClick={create} className="h-7 px-2">
            <LuPlus size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Floating bookmarks (when no nav strip) ─────────── */

/**
 * Renders a vertical stack of yellow circles on the right side of the screen,
 * one per bookmarked question that exists in the current question list.
 * Clicking scrolls smoothly to `#question-{number}` (set by QuestionView).
 */
export function BookmarksFloater({
  paperId,
  questions,
  getId,
  getNumber,
  scrollTargetId,
}: {
  paperId: string;
  questions: { id: string; number: string | number }[];
  getId?: (q: { id: string; number: string | number }) => string;
  getNumber?: (q: { id: string; number: string | number }, idx: number) => string | number;
  scrollTargetId?: (q: { id: string; number: string | number }, idx: number) => string;
}) {
  const bookmarks = useAnnotationsStore((s) => s.bookmarks);
  const items = useMemo(
    () =>
      questions
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => bookmarks[qkey(paperId, getId ? getId(q) : q.id)]),
    [questions, bookmarks, paperId, getId],
  );

  if (items.length === 0) return null;

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 print:hidden flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto py-2 px-1 rounded-full bg-card/80 backdrop-blur border border-yellow-500/40 shadow-lg">
      <div className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 text-center px-1">
        <LuBookmark size={10} className="inline" fill="currentColor" />
      </div>
      {items.map(({ q, idx }) => {
        const num = getNumber ? getNumber(q, idx) : q.number;
        const targetId = scrollTargetId ? scrollTargetId(q, idx) : `question-${q.number}`;
        return (
          <button
            key={q.id + idx}
            onClick={() => {
              const el = document.getElementById(targetId);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-8 h-8 rounded-full bg-yellow-400 text-yellow-950 border-2 border-yellow-500 text-[10px] font-extrabold flex items-center justify-center hover:scale-110 transition shadow"
            title={`Q${num}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-paper variant: each item carries its own paperId. */
export function MultiPaperBookmarksFloater({
  items,
}: {
  items: { paperId: string; qid: string; label: string | number; targetId: string }[];
}) {
  const bookmarks = useAnnotationsStore((s) => s.bookmarks);
  const visible = useMemo(
    () => items.filter((it) => bookmarks[qkey(it.paperId, it.qid)]),
    [items, bookmarks],
  );
  if (visible.length === 0) return null;
  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 print:hidden flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto py-2 px-1 rounded-full bg-card/80 backdrop-blur border border-yellow-500/40 shadow-lg">
      <div className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 text-center px-1">
        <LuBookmark size={10} className="inline" fill="currentColor" />
      </div>
      {visible.map((it, i) => (
        <button
          key={it.paperId + it.qid + i}
          onClick={() => {
            const el = document.getElementById(it.targetId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="w-8 h-8 rounded-full bg-yellow-400 text-yellow-950 border-2 border-yellow-500 text-[10px] font-extrabold flex items-center justify-center hover:scale-110 transition shadow"
          title={`Q${it.label}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

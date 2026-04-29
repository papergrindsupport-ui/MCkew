import { useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LuTag, LuMessageSquare, LuTrash2, LuPencil, LuPlus, LuX, LuCheck } from "react-icons/lu";
import { useAnnotationsStore, type QuestionTagDef } from "@/components/papers/useAnnotationsStore";
import { RichTextView } from "@/components/papers/RichTextView";
import { RichTextEditor } from "@/admin/RichTextEditor";
import {
  useSelectionAnnotationsStore,
  type SelectionAnnotation,
} from "./useSelectionAnnotationsStore";

/** Small inline indicator (circle) rendered after the last word of an annotated range. */
export function AnnotationCircle({ annotation }: { annotation: SelectionAnnotation }) {
  if (annotation.type === "tags") return <TagCircle annotation={annotation} />;
  if (annotation.type === "comment") return <CommentCircle annotation={annotation} />;
  return null;
}

/* ───────── Tag circle ───────── */

function useHoverHighlight(annotation: SelectionAnnotation) {
  const onEnter = () => {
    document.dispatchEvent(
      new CustomEvent("anno-hover", {
        detail: {
          blockKey: annotation.blockKey,
          start: annotation.start,
          end: annotation.end,
          on: true,
        },
      }),
    );
  };
  const onLeave = () => {
    document.dispatchEvent(
      new CustomEvent("anno-hover", {
        detail: {
          blockKey: annotation.blockKey,
          start: annotation.start,
          end: annotation.end,
          on: false,
        },
      }),
    );
  };
  return { onMouseEnter: onEnter, onMouseLeave: onLeave };
}

function TagCircle({ annotation }: { annotation: SelectionAnnotation }) {
  const library = useAnnotationsStore((s) => s.tagLibrary);
  const tagIds = annotation.tagIds ?? [];
  const tags = useMemo(
    () => tagIds.map((id) => library.find((t) => t.id === id)).filter(Boolean) as QuestionTagDef[],
    [tagIds, library],
  );
  const primary = tags[0];
  const more = tags.length > 1;
  const fill = primary?.color ?? "hsl(var(--primary))";
  const hover = useHoverHighlight(annotation);

  return (
    <Popover>
      <HoverCard openDelay={120} closeDelay={50}>
        <HoverCardTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={primary ? `Tag: ${primary.label}` : "Tags"}
              className="anno-circle"
              style={{ backgroundColor: fill, borderColor: fill }}
              {...hover}
            >
              <LuTag size={9} className="text-white" />
            </button>
          </PopoverTrigger>
        </HoverCardTrigger>
        {primary && (
          <HoverCardContent
            side="top"
            align="center"
            sideOffset={8}
            className="anno-tooltip w-auto min-w-0 max-w-xs p-0 border-0 bg-transparent shadow-none"
          >
            <div className="anno-tooltip-bubble">
              {primary.label}
              {more && <span className="anno-tooltip-more">…</span>}
            </div>
          </HoverCardContent>
        )}
      </HoverCard>
      <PopoverContent align="center" className="w-80 p-3 z-[220]">
        <TagEditor annotation={annotation} />
      </PopoverContent>
    </Popover>
  );
}

function TagEditor({ annotation }: { annotation: SelectionAnnotation }) {
  const library = useAnnotationsStore((s) => s.tagLibrary);
  const createTag = useAnnotationsStore((s) => s.createTag);
  const updateAnn = useSelectionAnnotationsStore((s) => s.update);
  const removeAnn = useSelectionAnnotationsStore((s) => s.remove);

  const tagIds = annotation.tagIds ?? [];
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const toggle = (id: string) => {
    const next = tagIds.includes(id) ? tagIds.filter((t) => t !== id) : [...tagIds, id];
    if (next.length === 0) removeAnn(annotation.id);
    else updateAnn(annotation.id, { tagIds: next });
  };

  const create = () => {
    if (!newLabel.trim()) return;
    const t = createTag(newLabel.trim(), newColor);
    updateAnn(annotation.id, { tagIds: [...tagIds, t.id] });
    setNewLabel("");
  };

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        Tagged text
      </div>
      <div className="text-sm italic text-foreground/80 mb-3 line-clamp-3">“{annotation.text}”</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
        Tags
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
        {library.map((t) => {
          const on = tagIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
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
              {on && <LuCheck size={9} />}
              <LuTag size={9} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="border-t border-border/40 pt-2">
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
      <div className="border-t border-border/40 pt-2 mt-3 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive h-7 gap-1"
          onClick={() => removeAnn(annotation.id)}
        >
          <LuTrash2 size={12} /> Remove all tags
        </Button>
      </div>
    </div>
  );
}

/* ───────── Comment circle ───────── */

function CommentCircle({ annotation }: { annotation: SelectionAnnotation }) {
  const updateAnn = useSelectionAnnotationsStore((s) => s.update);
  const removeAnn = useSelectionAnnotationsStore((s) => s.remove);
  const [editing, setEditing] = useState(false);
  const hover = useHoverHighlight(annotation);

  const truncated = useMemo(() => {
    const flat = (annotation.commentBody ?? [])
      .map((b) =>
        "runs" in b ? b.runs.map((r) => (r.type === "text" ? r.text : "")).join("") : "",
      )
      .join(" ");
    return flat.length > 60 ? flat.slice(0, 60) + "…" : flat || "(empty comment)";
  }, [annotation.commentBody]);

  return (
    <Popover>
      <HoverCard openDelay={120} closeDelay={50}>
        <HoverCardTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Comment"
              className="anno-circle anno-circle-comment"
              {...hover}
            >
              <LuMessageSquare size={9} className="text-white" />
            </button>
          </PopoverTrigger>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="center"
          sideOffset={8}
          className="anno-tooltip w-auto min-w-0 max-w-xs p-0 border-0 bg-transparent shadow-none"
        >
          <div className="anno-tooltip-bubble">{truncated}</div>
        </HoverCardContent>
      </HoverCard>
      <PopoverContent align="center" className="w-96 p-3 z-[220]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Commented text
        </div>
        <div className="text-sm italic text-foreground/80 mb-3 line-clamp-3">
          “{annotation.text}”
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Comment
        </div>
        {editing ? (
          <RichTextEditor
            value={annotation.commentBody ?? []}
            onChange={(body) => updateAnn(annotation.id, { commentBody: body })}
            placeholder="Write your note…"
          />
        ) : (
          <div className="prose prose-sm max-w-none rounded-xl border border-border/40 bg-card/40 p-3 min-h-[60px]">
            {(annotation.commentBody ?? []).length === 0 ? (
              <span className="text-muted-foreground text-xs">(empty)</span>
            ) : (
              <RichTextView rich={annotation.commentBody ?? []} />
            )}
          </div>
        )}
        <div className="flex justify-between gap-2 mt-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive h-7 gap-1"
            onClick={() => removeAnn(annotation.id)}
          >
            <LuTrash2 size={12} /> Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? (
              <>
                <LuX size={12} /> Done
              </>
            ) : (
              <>
                <LuPencil size={12} /> Edit
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

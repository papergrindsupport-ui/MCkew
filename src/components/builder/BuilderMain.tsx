import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LuStickyNote,
  LuMinus,
  LuTrash2,
  LuCheckCheck,
  LuPalette,
  LuGripVertical,
  LuX,
  LuPencil,
  LuType,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "./useBuilderStore";
import type { BuilderItem, BuilderQuestionItem } from "./types";
import { BuilderQuestionCard } from "./BuilderQuestionCard";
import { RichTextEditor } from "@/admin/RichTextEditor";
import { RichTextView } from "@/components/papers/RichTextView";
import type { RichText } from "@/data/questionData";

const DIVIDER_COLORS = [
  { name: "Primary", value: "hsl(var(--primary))" },
  { name: "Foreground", value: "hsl(var(--foreground))" },
  { name: "Red", value: "#ef4444" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
];

interface Props {
  onEditItem: (item: BuilderQuestionItem) => void;
  showTitles: boolean;
  onShowTitlesChange: (v: boolean) => void;
}

export function BuilderMain({ onEditItem, showTitles, onShowTitlesChange }: Props) {
  const items = useBuilderStore((s) => s.draft.items);
  const removeItems = useBuilderStore((s) => s.removeItems);
  const addNote = useBuilderStore((s) => s.addNote);
  const addDivider = useBuilderStore((s) => s.addDivider);
  const updateItem = useBuilderStore((s) => s.updateItem);
  const selectedItemIds = useBuilderStore((s) => s.selectedItemIds);
  const setSelected = useBuilderStore((s) => s.setSelected);
  const toggleSelected = useBuilderStore((s) => s.toggleSelected);
  const setSettings = useBuilderStore((s) => s.setSettings);

  const [selectMode, setSelectMode] = useState(false);
  const [dividerColor, setDividerColor] = useState(DIVIDER_COLORS[0].value);

  const drop = useDroppable({ id: "builder-main-drop", data: { kind: "main-drop" } });

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-card/30 backdrop-blur sticky top-0 z-10 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => addNote()}>
          <LuStickyNote className="mr-1.5" size={14} /> Note
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <LuMinus className="mr-1.5" size={14} /> Divider
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 z-[150]">
            <p className="text-xs font-bold mb-2">Divider color</p>
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {DIVIDER_COLORS.map((c) => (
                <button
                  key={c.name}
                  className={cn(
                    "w-7 h-7 rounded-full border-2",
                    dividerColor === c.value ? "border-foreground" : "border-border",
                  )}
                  style={{ background: c.value }}
                  onClick={() => setDividerColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={() => addDivider(dividerColor)}>
              Add divider
            </Button>
          </PopoverContent>
        </Popover>

        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none ml-1">
          <input
            type="checkbox"
            checked={showTitles}
            onChange={(e) => {
              const v = e.target.checked;
              onShowTitlesChange(v);
              // Keep export/preview in sync: "showQuestionHeaders" controls whether
              // ExamPreviewPage shows the big question header vs inline numbering.
              setSettings({ showQuestionHeaders: v });
            }}
            className="accent-primary h-4 w-4 cursor-pointer"
          />
          <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground/80">
            <LuType size={12} /> View titles
          </span>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant={selectMode ? "default" : "outline"}
            onClick={() => {
              setSelectMode((s) => !s);
              if (selectMode) setSelected([]);
            }}
          >
            <LuCheckCheck className="mr-1.5" size={14} />
            {selectMode ? "Done" : "Select"}
          </Button>
          {selectMode && selectedItemIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                removeItems(selectedItemIds);
              }}
            >
              <LuTrash2 className="mr-1.5" size={14} /> Remove ({selectedItemIds.length})
            </Button>
          )}
        </div>
      </div>

      <div
        ref={drop.setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto p-4 sm:p-6",
          drop.isOver && "ring-2 ring-primary ring-inset bg-primary/5",
        )}
      >
        <div className="max-w-3xl mx-auto space-y-3">
          {items.length === 0 && (
            <div className="border-2 border-dashed border-border/60 rounded-2xl p-12 text-center">
              <p className="text-muted-foreground text-sm">
                Drag questions from the sidebar, or click <kbd>+</kbd>.
                <br />
                You can also add notes and dividers above.
              </p>
            </div>
          )}
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {(() => {
              let qIdx = 0;
              return items.map((item) => {
                if (item.kind === "question") {
                  const idx = qIdx++;
                  return (
                    <BuilderQuestionCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onDelete={() => removeItems([item.id])}
                      onEdit={() => onEditItem(item)}
                      selectMode={selectMode}
                      selected={selectedItemIds.includes(item.id)}
                      onToggleSelect={() => toggleSelected(item.id)}
                      showTitles={showTitles}
                    />
                  );
                }
                if (item.kind === "note") {
                  return (
                    <SortableShell key={item.id} id={item.id}>
                      {(handle) => (
                        <NoteItem
                          item={item}
                          handle={handle}
                          onChange={(rich) => updateItem(item.id, { rich })}
                          onRemove={() => removeItems([item.id])}
                        />
                      )}
                    </SortableShell>
                  );
                }
                return (
                  <SortableShell key={item.id} id={item.id}>
                    {(handle) => (
                      <DividerItem
                        item={item}
                        handle={handle}
                        onRemove={() => removeItems([item.id])}
                      />
                    )}
                  </SortableShell>
                );
              });
            })()}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

function SortableShell({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const sortable = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };
  const handle = (
    <button
      type="button"
      {...sortable.attributes}
      {...sortable.listeners}
      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      aria-label="Drag to reorder"
    >
      <LuGripVertical size={16} />
    </button>
  );
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(sortable.isDragging && "opacity-60 ring-2 ring-primary rounded-xl shadow-2xl")}
    >
      {children(handle)}
    </div>
  );
}

function NoteItem({
  item,
  handle,
  onChange,
  onRemove,
}: {
  item: Extract<BuilderItem, { kind: "note" }>;
  handle: React.ReactNode;
  onChange: (rich: RichText) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const rich: RichText =
    item.rich ?? (item.text ? [{ kind: "p", runs: [{ type: "text", text: item.text }] }] : []);
  const isEmpty = rich.length === 0;
  return (
    <div className="rounded-xl border-2 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
      {handle}
      <div className="flex-1 min-w-0">
        {editing ? (
          <RichTextEditor value={rich} onChange={onChange} placeholder="Write a note…" />
        ) : (
          <div className="prose prose-sm max-w-none cursor-text" onClick={() => setEditing(true)}>
            {isEmpty ? (
              <p className="text-muted-foreground italic m-0">Click to write a note…</p>
            ) : (
              <RichTextView rich={rich} />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditing((e) => !e)}
          className="w-7 h-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary inline-flex items-center justify-center"
          aria-label={editing ? "Done editing" : "Edit note"}
          title={editing ? "Done" : "Edit"}
        >
          {editing ? <LuX size={14} /> : <LuPencil size={12} />}
        </button>
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive inline-flex items-center justify-center"
          aria-label="Remove note"
        >
          <LuTrash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function DividerItem({
  item,
  handle,
  onRemove,
}: {
  item: Extract<BuilderItem, { kind: "divider" }>;
  handle: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group py-1">
      <span className="opacity-0 group-hover:opacity-100 transition">{handle}</span>
      <div className="flex-1 h-1 rounded-full" style={{ background: item.color }} />
      <span
        className="opacity-0 group-hover:opacity-100 transition inline-flex items-center"
        title={item.color}
      >
        <LuPalette size={12} className="text-muted-foreground" />
      </span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive inline-flex items-center justify-center"
        aria-label="Remove divider"
      >
        <LuX size={12} />
      </button>
    </div>
  );
}

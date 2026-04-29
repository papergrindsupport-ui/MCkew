import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { LuChevronDown, LuGripVertical, LuPencil, LuTrash2 } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { QuestionView } from "@/components/papers/QuestionView";
import type { BuilderQuestionItem } from "./types";
import { SelectionCheckbox } from "@/components/smart-solve/SelectionCheckbox";
import { parsePaperId } from "@/data/paperData";

interface Props {
  item: BuilderQuestionItem;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** When false, hide paper-specific identifying info and show subject + sequence number inline. */
  showTitles?: boolean;
}

const SUBJECT_LABEL: Record<string, string> = {
  bio: "Biology",
  chem: "Chemistry",
  phys: "Physics",
};

export function BuilderQuestionCard({
  item,
  index,
  onDelete,
  onEdit,
  selectMode,
  selected,
  onToggleSelect,
  showTitles = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const sortable = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const q = item.question;

  const parsed = parsePaperId(q.paperId);
  const subjectLabel = parsed ? (SUBJECT_LABEL[parsed.subject] ?? parsed.subject) : "Custom";

  const headerLabel = showTitles
    ? item.source
      ? `Q${q.number} · ${item.source.paperId}`
      : `Custom: Q${q.number}`
    : `${subjectLabel} ${index + 1}`;

  const inlineLabel = showTitles ? undefined : `${subjectLabel} ${index + 1}.`;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border-2 border-border/60 bg-card/60 backdrop-blur overflow-hidden",
        sortable.isDragging && "opacity-60 ring-2 ring-primary shadow-2xl",
      )}
    >
      <header className="flex items-center gap-2 p-3">
        <button
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <LuGripVertical size={16} />
        </button>
        {selectMode && (
          <SelectionCheckbox
            checked={!!selected}
            onChange={() => onToggleSelect?.()}
            label={`Select question ${index + 1}`}
          />
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <span className="font-bold text-sm sm:text-base truncate">{headerLabel}</span>
          <LuChevronDown
            size={14}
            className={cn("ml-2 text-muted-foreground transition shrink-0", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit question"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/50 text-muted-foreground hover:border-primary/60 hover:text-primary transition"
        >
          <LuPencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Remove from builder"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/50 text-muted-foreground hover:border-destructive hover:text-destructive transition"
        >
          <LuTrash2 size={14} />
        </button>
      </header>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3">
              <QuestionView question={q} index={0} inlineLabel={inlineLabel} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

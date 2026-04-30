// Per-question editor: intro (rich text), data blocks (images for v1),
// question text, type selector + per-type options, and props (topics/skills/etc).
//
// v1 question types: text-options (4 text MCQ) and free-text (no options).
// Other types are scaffolded as JSON fallback editors for forward compatibility.

import { useEffect, useState } from "react";
import {
  LuTrash2,
  LuPlus,
  LuImage,
  LuChevronUp,
  LuChevronDown,
  LuEye,
  LuTable2,
  LuChartColumn,
} from "react-icons/lu";
import type {
  Question,
  MCQOptions,
  TextOptionsMCQ,
  OptionLetter,
  ImageBlock,
  TableBlock,
  ChartBlock,
  DataRow,
  RichText,
} from "@/data/questionData";
import { OPTION_LETTERS } from "@/data/questionData";
import {
  TOPICS,
  SKILLS,
  ALL_TAGS,
  DIFFICULTIES,
  PRIORITIES,
  TARGET_GRADES,
  TRAPS,
} from "@/data/topics";
import { RichTextEditor } from "./PencilEditor";
import { TableBuilder, emptyTable } from "./TableBuilder";
import { GraphBuilder, emptyChart } from "./GraphBuilder";
import {
  GraphOptionsEditor,
  ImageOptionsEditor,
  ImagePositionedEditor,
  TableOptionsEditor,
  emptyGraphOptions,
  emptyImageOptions,
  emptyImagePositioned,
  emptyTableRowOptions,
} from "./AdvancedOptionsEditors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperSessionProvider } from "@/components/papers/PaperSession";
import { Dropdown } from "@/admin/ui/Dropdown";
import { Section } from "@/admin/ui/Section";
import { cn } from "@/lib/utils";
import { ImageUploadButton } from "./ImageUploadButton";

const QUESTION_TYPES = [
  { key: "text-options", label: "Text MCQ (4 options)" },
  { key: "free-text", label: "Free text (no options)" },
  { key: "image-options", label: "Image MCQ" },
  { key: "graph-options", label: "Graph MCQ" },
  { key: "table-options-rows", label: "Table MCQ rows" },
  { key: "table-options-cols", label: "Table MCQ columns" },
  { key: "table-options-cells", label: "Table MCQ cells" },
  { key: "image-positioned", label: "Position-on-image MCQ" },
];

function isTableOptions(
  options: MCQOptions | undefined,
): options is Extract<
  MCQOptions,
  { type: "table-options-rows" | "table-options-cols" | "table-options-cells" }
> {
  return (
    !!options &&
    ["table-options-rows", "table-options-cols", "table-options-cells"].includes(options.type)
  );
}

export function emptyQuestion(paperId: string, num: number): Question {
  return {
    id: `q-admin-${paperId}-${Date.now()}-${num}`,
    number: String(num),
    paperId,
    questionType: "text-options",
    intro: [],
    text: [{ kind: "p", runs: [{ type: "text", text: "" }] }],
    options: {
      type: "text-options",
      layout: "vertical",
      options: OPTION_LETTERS.map((letter) => ({
        letter,
        content: [{ kind: "p", runs: [{ type: "text", text: `Option ${letter}` }] }],
      })),
    } as TextOptionsMCQ,
    topics: [],
    lessons: [],
    skills: [],
    tags: [],
    traps: [],
    difficulty: "medium",
    priority: "medium",
    targetGrade: "C",
    repetition: 1,
  };
}

interface Props {
  question: Question;
  onChange: (q: Question) => void;
  correctLetter: OptionLetter | null;
  onCorrectLetterChange: (l: OptionLetter | null) => void;
}

export function QuestionForm({ question, onChange, correctLetter, onCorrectLetterChange }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const q = question;

  function setField<K extends keyof Question>(key: K, val: Question[K]) {
    onChange({ ...q, [key]: val });
  }

  /* ─── Data rows / images ─── */
  const data: DataRow[] = q.data ?? [];
  function setData(next: DataRow[]) {
    setField("data", next);
  }
  function addImage() {
    const block: ImageBlock = {
      type: "image",
      src: "https://placehold.co/600x400?text=Image",
      alt: "",
      imageType: "Photograph",
      size: "md",
    };
    setData([...data, { blocks: [block] }]);
  }
  function addTable() {
    setData([...data, { blocks: [emptyTable()] }]);
  }
  function addChart() {
    setData([...data, { blocks: [emptyChart("bar")] }]);
  }
  function updateDataBlock(idx: number, block: ImageBlock | TableBlock | ChartBlock) {
    const next = data.slice();
    next[idx] = { blocks: [block] };
    setData(next);
  }
  function moveRow(idx: number, dir: -1 | 1) {
    const next = data.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setData(next);
  }

  /* ─── Options edit (text-options only for v1) ─── */
  function setTextOption(idx: number, content: RichText) {
    if (q.options?.type !== "text-options") return;
    const opts = q.options.options.map((o, i) => (i === idx ? { ...o, content } : o));
    setField("options", { ...q.options, options: opts });
  }
  function setOptionTags(idx: number, tagsCsv: string) {
    if (q.options?.type !== "text-options") return;
    const tags = tagsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const opts = q.options.options.map((o, i) => (i === idx ? { ...o, tags } : o));
    setField("options", { ...q.options, options: opts });
  }

  function setQuestionType(t: string) {
    if (t === "free-text") {
      onChange({ ...q, questionType: t, options: undefined });
      return;
    }
    if (t === "text-options") {
      const opts: MCQOptions = {
        type: "text-options",
        layout: "vertical",
        options: OPTION_LETTERS.map((letter) => ({
          letter,
          content: [{ kind: "p", runs: [{ type: "text", text: `Option ${letter}` }] }],
        })),
      };
      onChange({ ...q, questionType: t, options: opts });
      return;
    }
    const factory: Record<string, () => MCQOptions> = {
      "image-options": emptyImageOptions,
      "graph-options": emptyGraphOptions,
      "table-options-rows": emptyTableRowOptions,
      "table-options-cols": () => ({
        ...emptyTableRowOptions(),
        type: "table-options-cols",
        optionCols: OPTION_LETTERS.map((letter, i) => ({ letter, colIndex: i % 2 })),
      }),
      "table-options-cells": () => ({
        ...emptyTableRowOptions(),
        type: "table-options-cells",
        optionCells: OPTION_LETTERS.map((letter, i) => ({ letter, row: i % 2, col: i % 2 })),
      }),
      "image-positioned": emptyImagePositioned,
    };
    const nextOptions = q.options?.type === t ? q.options : factory[t]?.();
    onChange({ ...q, questionType: t, options: nextOptions });
  }

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-mono text-muted-foreground">
          Q{q.number} · {q.id}
        </div>
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <LuEye size={14} /> Preview
        </Button>
      </div>

      {/* Intro */}
      <Section title="Intro (optional)">
        <RichTextEditor
          value={q.intro}
          onChange={(v) => setField("intro", v)}
          placeholder="Question intro / context…"
        />
      </Section>

      {/* Data blocks (images only in v1) */}
      <Section
        title="Data blocks"
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={addImage}
              className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap"
            >
              <LuImage size={14} />
              <span>Image</span>{" "}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addTable}
              className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap"
            >
              <LuTable2 size={14} />
              <span>Table</span>{" "}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addChart}
              className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap"
            >
              <LuChartColumn size={14} />
              <span>Graph</span>{" "}
            </Button>
          </div>
        }
      >
        {data.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No images, tables, or charts yet. Tables and charts arrive in the next phase.
          </p>
        )}
        <div className="space-y-3">
          {data.map((row, i) => {
            const block = row.blocks[0];
            if (!block) return null;
            if (block.type === "table") {
              return (
                <DataBlockShell
                  key={i}
                  title={`Table #${i + 1}`}
                  index={i}
                  total={data.length}
                  onMove={moveRow}
                  onDelete={() => setData(data.filter((_, j) => j !== i))}
                >
                  <TableBuilder value={block} onChange={(next) => updateDataBlock(i, next)} />
                </DataBlockShell>
              );
            }
            if (block.type === "chart") {
              return (
                <DataBlockShell
                  key={i}
                  title={`Graph #${i + 1}`}
                  index={i}
                  total={data.length}
                  onMove={moveRow}
                  onDelete={() => setData(data.filter((_, j) => j !== i))}
                >
                  <GraphBuilder value={block} onChange={(next) => updateDataBlock(i, next)} />
                </DataBlockShell>
              );
            }
            return (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Image #{i + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveRow(i, -1)}
                      disabled={i === 0}
                    >
                      <LuChevronUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveRow(i, +1)}
                      disabled={i === data.length - 1}
                    >
                      <LuChevronDown size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setData(data.filter((_, j) => j !== i))}
                    >
                      <LuTrash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <ImageUploadButton
                      label="Drop an image here, or click to choose"
                      onUploaded={(url) => {
                        const next = data.slice();
                        // Always replace prior URL with the new UploadThing URL.
                        next[i] = {
                          blocks: [
                            {
                              type: "image",
                              src: url,
                              alt: block.alt ?? "",
                              imageType: block.imageType ?? "Photograph",
                              size: block.size ?? "md",
                              title: block.title,
                              caption: block.caption,
                            } as ImageBlock,
                          ],
                        };
                        setData(next);
                      }}
                    />
                    <Input
                      placeholder="Or paste image URL"
                      value={block.src}
                      onChange={(e) => {
                        const next = data.slice();
                        next[i] = { blocks: [{ ...block, src: e.target.value } as ImageBlock] };
                        setData(next);
                      }}
                    />
                  </div>
                  <Input
                    placeholder="Alt text"
                    value={block.alt}
                    onChange={(e) => {
                      const next = data.slice();
                      next[i] = { blocks: [{ ...block, alt: e.target.value } as ImageBlock] };
                      setData(next);
                    }}
                  />
                  <Dropdown<string>
                    value={block.imageType}
                    onChange={(v) => {
                      const next = data.slice();
                      next[i] = {
                        blocks: [
                          { ...block, imageType: v as "Photograph" | "Diagram" } as ImageBlock,
                        ],
                      };
                      setData(next);
                    }}
                    options={[
                      { value: "Photograph", label: "Photograph" },
                      { value: "Diagram", label: "Diagram" },
                    ]}
                  />
                  <Dropdown<string>
                    value={block.size ?? "md"}
                    onChange={(v) => {
                      const next = data.slice();
                      next[i] = {
                        blocks: [{ ...block, size: v as "sm" | "md" | "lg" } as ImageBlock],
                      };
                      setData(next);
                    }}
                    options={[
                      { value: "sm", label: "Small" },
                      { value: "md", label: "Medium" },
                      { value: "lg", label: "Large" },
                    ]}
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <RichTextEditor
                    minimal
                    value={block.title ?? []}
                    onChange={(v) => {
                      const next = data.slice();
                      next[i] = { blocks: [{ ...block, title: v } as ImageBlock] };
                      setData(next);
                    }}
                  />
                </div>
                <div>
                  <Label>Caption</Label>
                  <RichTextEditor
                    minimal
                    value={block.caption ?? []}
                    onChange={(v) => {
                      const next = data.slice();
                      next[i] = { blocks: [{ ...block, caption: v } as ImageBlock] };
                      setData(next);
                    }}
                  />
                </div>
                {block.src && (
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/20 max-w-md shadow-sm">
                    <img
                      key={block.src}
                      src={block.src}
                      alt={block.alt || "Preview"}
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Question text */}
      <Section title="Question text">
        <RichTextEditor
          value={q.text}
          onChange={(v) => setField("text", v)}
          placeholder="The actual question…"
        />
      </Section>

      {/* Question type */}
      <Section title="Question type">
        <div className="max-w-md">
          <Dropdown<string>
            value={q.questionType ?? "text-options"}
            onChange={(v) => setQuestionType(v)}
            options={QUESTION_TYPES.map((t) => ({ value: t.key, label: t.label }))}
          />
        </div>
      </Section>

      {/* Options */}
      {q.options?.type === "text-options" && (
        <Section title="Text options (4)">
          <div className="flex items-center gap-2 mb-3">
            <Label>Layout:</Label>
            <div className="w-40">
              <Dropdown<string>
                size="sm"
                value={q.options.layout ?? "vertical"}
                onChange={(v) =>
                  setField("options", {
                    ...q.options!,
                    layout: v as "vertical" | "horizontal" | "grid",
                  } as MCQOptions)
                }
                options={[
                  { value: "vertical", label: "Vertical" },
                  { value: "horizontal", label: "Horizontal" },
                  { value: "grid", label: "Grid (2x2)" },
                ]}
              />
            </div>
          </div>
          <div className="space-y-3">
            {q.options.options.map((opt, i) => (
              <div
                key={opt.letter}
                className={cn(
                  "rounded-lg border-2 p-3 space-y-2 bg-card transition-colors",
                  correctLetter === opt.letter
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">Option {opt.letter}</span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={correctLetter === opt.letter}
                      onChange={() => onCorrectLetterChange(opt.letter)}
                    />
                    Correct answer
                  </label>
                </div>
                <RichTextEditor minimal value={opt.content} onChange={(v) => setTextOption(i, v)} />
                <Input
                  placeholder="Tags (comma-separated, e.g. trap-option, easy-to-eliminate)"
                  value={(opt.tags ?? []).join(", ")}
                  onChange={(e) => setOptionTags(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {q.questionType === "free-text" && (
        <Section title="Free text answer">
          <p className="text-xs text-muted-foreground">
            Free-text questions have no options. Students will see only the prompt and a free-text
            input on the paper page.
          </p>
        </Section>
      )}

      {q.options?.type === "image-options" && (
        <Section title="Image MCQ options">
          <ImageOptionsEditor
            value={q.options}
            onChange={(v) => setField("options", v)}
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        </Section>
      )}

      {q.options?.type === "graph-options" && (
        <Section title="Graph MCQ options">
          <GraphOptionsEditor
            value={q.options}
            onChange={(v) => setField("options", v)}
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        </Section>
      )}

      {isTableOptions(q.options) && (
        <Section title="Table MCQ options">
          <TableOptionsEditor
            value={q.options}
            onChange={(v) => setField("options", v)}
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        </Section>
      )}

      {q.options?.type === "image-positioned" && (
        <Section title="Position-on-image MCQ options">
          <ImagePositionedEditor
            value={q.options}
            onChange={(v) => setField("options", v)}
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        </Section>
      )}

      {/* Question props */}
      <Section title="Question metadata (props)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Difficulty">
            <Dropdown<string>
              value={q.difficulty}
              onChange={(v) => setField("difficulty", v as Question["difficulty"])}
              options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
            />
          </Field>
          <Field label="Priority">
            <Dropdown<string>
              value={q.priority}
              onChange={(v) => setField("priority", v as Question["priority"])}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
          </Field>
          <Field label="Target grade">
            <Dropdown<string>
              value={q.targetGrade}
              onChange={(v) => setField("targetGrade", v as Question["targetGrade"])}
              options={TARGET_GRADES.map((g) => ({ value: g, label: g }))}
            />
          </Field>
          <Field label="Repetition (historical)">
            <Input
              type="number"
              min={1}
              value={q.repetition}
              onChange={(e) => setField("repetition", Number(e.target.value) || 1)}
            />
          </Field>

          <MultiPickField
            label="Topics"
            options={TOPICS.map((t) => ({ key: t.key, label: `${t.label} (${t.subject})` }))}
            value={q.topics}
            onChange={(v) => setField("topics", v)}
          />
          <MultiPickField
            label="Lessons"
            options={TOPICS.flatMap((t) =>
              t.lessons.map((l) => ({ key: l.key, label: `${t.label} › ${l.label}` })),
            )}
            value={q.lessons}
            onChange={(v) => setField("lessons", v)}
          />
          <MultiPickField
            label="Skills"
            options={SKILLS.flatMap((s) =>
              s.sub.map((sub) => ({ key: sub.key, label: `${s.label} › ${sub.label}` })),
            )}
            value={q.skills}
            onChange={(v) => setField("skills", v)}
          />
          <MultiPickField
            label="Tags"
            options={ALL_TAGS.map((t) => ({ key: t, label: t }))}
            value={q.tags}
            onChange={(v) => setField("tags", v)}
          />
          <MultiPickField
            label="Traps"
            options={TRAPS.map((t) => ({ key: t.key, label: t.label }))}
            value={q.traps}
            onChange={(v) => setField("traps", v)}
          />
        </div>
      </Section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question preview</DialogTitle>
          </DialogHeader>
          <PaperSessionProvider paperId={q.paperId} questions={[q]}>
            <QuestionView question={q} index={0} />
          </PaperSessionProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────── Small UI helpers ─────────────── */

function DataBlockShell({
  title,
  index,
  total,
  onMove,
  onDelete,
  children,
}: {
  title: string;
  index: number;
  total: number;
  onMove: (idx: number, dir: -1 | 1) => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
          >
            <LuChevronUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(index, +1)}
            disabled={index === total - 1}
          >
            <LuChevronDown size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <LuTrash2 size={14} className="text-destructive" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground mb-1">{children}</label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

interface MultiPickProps {
  label: string;
  options: { key: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}

function MultiPickField({ label, options, value, onChange }: MultiPickProps) {
  const [filter, setFilter] = useState("");
  const selected = new Set(value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  }
  return (
    <div>
      <Label>{label}</Label>
      <Input
        placeholder={`Filter ${label.toLowerCase()}…`}
        className="mb-1.5"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto rounded-md border border-input bg-background p-2 flex flex-wrap gap-1">
        {filtered.map((o) => (
          <button
            type="button"
            key={o.key}
            onClick={() => toggle(o.key)}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs border transition-colors",
              selected.has(o.key)
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
        {filtered.length === 0 && <span className="text-xs text-muted-foreground">No matches</span>}
      </div>
      {selected.size > 0 && (
        <div className="text-[10px] text-muted-foreground mt-1">{selected.size} selected</div>
      )}
    </div>
  );
}

// Editors for the advanced MCQ question types.
// Each component takes the matching MCQOptions variant and emits an updated one.

import { useRef, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type {
  ImageOptionsMCQ,
  GraphOptionsMCQ,
  TableRowOptionsMCQ,
  TableColOptionsMCQ,
  TableCellOptionsMCQ,
  ImagePositionedMCQ,
  OptionLetter,
  ChartBlock,
  TableBlock,
  RichText,
  MCQOptions,
} from "@/data/questionData";
import { OPTION_LETTERS } from "@/data/questionData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./PencilEditor";
import { TableBuilder, emptyTable } from "./TableBuilder";
import { GraphBuilder, emptyChart } from "./GraphBuilder";
import { Dropdown } from "@/admin/ui/Dropdown";
import { ImageUploadButton } from "@/admin/ImageUploadButton";
import { cn } from "@/lib/utils";

const emptyRich = (): RichText => [{ kind: "p", runs: [{ type: "text", text: "" }] }];

type Pickable = {
  letter: OptionLetter;
  tags?: string[];
};

interface CommonProps {
  correctLetter: OptionLetter | null;
  onCorrectLetterChange: (l: OptionLetter | null) => void;
}

/* ─────────────── Image options ─────────────── */

export function ImageOptionsEditor({
  value,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: CommonProps & { value: ImageOptionsMCQ; onChange: (v: ImageOptionsMCQ) => void }) {
  function setOpt(i: number, patch: Partial<ImageOptionsMCQ["options"][number]>) {
    onChange({
      ...value,
      options: value.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    });
  }
  return (
    <div className="space-y-3">
      <LayoutPicker value={value.layout} onChange={(l) => onChange({ ...value, layout: l })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {value.options.map((o, i) => (
          <OptionShell
            key={o.letter}
            letter={o.letter}
            isCorrect={correctLetter === o.letter}
            onMarkCorrect={() => onCorrectLetterChange(o.letter)}
            tagsCsv={(o.tags ?? []).join(", ")}
            onTagsChange={(csv) =>
              setOpt(i, {
                tags: csv
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          >
            <div className="space-y-2">
              <ImageUploadButton
                compact
                label={`Upload option ${o.letter}`}
                onUploaded={(url) => setOpt(i, { src: url, alt: o.alt ?? "" })}
              />
              <Input
                placeholder="Or paste image URL"
                value={o.src}
                onChange={(e) => setOpt(i, { src: e.target.value })}
              />
            </div>
            <Input
              placeholder="Alt text"
              value={o.alt}
              onChange={(e) => setOpt(i, { alt: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Dropdown<string>
                value={o.imageType ?? "Photograph"}
                onChange={(v) => setOpt(i, { imageType: v as "Photograph" | "Diagram" })}
                options={[
                  { value: "Photograph", label: "Photograph" },
                  { value: "Diagram", label: "Diagram" },
                ]}
              />
              <Dropdown<string>
                value={o.size ?? "md"}
                onChange={(v) => setOpt(i, { size: v as "sm" | "md" | "lg" })}
                options={[
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                ]}
              />
            </div>
            {o.src && (
              <div
                className={cn(
                  "rounded overflow-hidden border border-border mx-auto w-full",
                  o.size === "sm" && "max-w-[200px]",
                  o.size === "lg" && "max-w-2xl",
                  (!o.size || o.size === "md") && "max-w-sm",
                  o.imageType === "Diagram" && "diagram-img",
                )}
              >
                <img
                  src={o.src}
                  alt={o.alt}
                  className={cn(
                    "w-full h-auto block",
                    o.imageType === "Diagram" &&
                      "mix-blend-multiply dark:mix-blend-screen dark:invert",
                  )}
                />
              </div>
            )}
            <RichTextEditor
              minimal
              value={o.caption ?? []}
              onChange={(v) => setOpt(i, { caption: v })}
              placeholder="Caption (optional)"
            />
          </OptionShell>
        ))}
      </div>
    </div>
  );
}

export function emptyImageOptions(): ImageOptionsMCQ {
  return {
    type: "image-options",
    layout: "grid",
    options: OPTION_LETTERS.map((letter) => ({ letter, src: "", alt: "" })),
  };
}

/* ─────────────── Graph options ─────────────── */

export function GraphOptionsEditor({
  value,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: CommonProps & { value: GraphOptionsMCQ; onChange: (v: GraphOptionsMCQ) => void }) {
  const [active, setActive] = useState(0);
  function setOptChart(i: number, chart: ChartBlock) {
    onChange({
      ...value,
      options: value.options.map((o, idx) => (idx === i ? { ...o, chart } : o)),
    });
  }
  function setOptTags(i: number, csv: string) {
    onChange({
      ...value,
      options: value.options.map((o, idx) =>
        idx === i
          ? {
              ...o,
              tags: csv
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : o,
      ),
    });
  }
  const opt = value.options[active];
  return (
    <div className="space-y-3">
      <LayoutPicker value={value.layout} onChange={(l) => onChange({ ...value, layout: l })} />
      <div className="flex items-center gap-1">
        {value.options.map((o, i) => (
          <button
            key={o.letter}
            onClick={() => setActive(i)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-bold border-2 transition-colors",
              i === active
                ? "border-primary text-primary bg-primary/10"
                : "border-border bg-background hover:bg-muted",
              correctLetter === o.letter && "ring-2 ring-emerald-500/40",
            )}
          >
            Option {o.letter}
            {correctLetter === o.letter && " ✓"}
          </button>
        ))}
      </div>
      {opt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs flex items-center gap-1.5">
              <input
                type="radio"
                name="graph-correct"
                checked={correctLetter === opt.letter}
                onChange={() => onCorrectLetterChange(opt.letter)}
              />
              Mark as correct
            </label>
            <Input
              placeholder="Option tags"
              value={(opt.tags ?? []).join(", ")}
              onChange={(e) => setOptTags(active, e.target.value)}
              className="max-w-xs"
            />
          </div>
          <GraphBuilder value={opt.chart} onChange={(c) => setOptChart(active, c)} />
        </div>
      )}
    </div>
  );
}

export function emptyGraphOptions(): GraphOptionsMCQ {
  return {
    type: "graph-options",
    layout: "grid",
    options: OPTION_LETTERS.map((letter) => ({ letter, chart: emptyChart("line") })),
  };
}

/* ─────────────── Table options (rows/cols/cells) ─────────────── */

export function TableOptionsEditor({
  value,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: CommonProps & {
  value: TableRowOptionsMCQ | TableColOptionsMCQ | TableCellOptionsMCQ;
  onChange: (v: MCQOptions) => void;
}) {
  const subtype =
    value.type === "table-options-rows"
      ? "rows"
      : value.type === "table-options-cols"
        ? "cols"
        : "cells";
  const cols = value.table.rows[0]?.length ?? 0;
  const rows = value.table.rows.length;

  function changeSubtype(next: "rows" | "cols" | "cells") {
    if (next === subtype) return;
    if (next === "rows") {
      onChange({
        type: "table-options-rows",
        table: value.table,
        optionRows: OPTION_LETTERS.map((letter, i) => ({
          letter,
          rowIndex: Math.min(i + 1, rows - 1),
        })),
      });
    } else if (next === "cols") {
      onChange({
        type: "table-options-cols",
        table: value.table,
        optionCols: OPTION_LETTERS.map((letter, i) => ({
          letter,
          colIndex: Math.min(i + 1, cols - 1),
        })),
      });
    } else {
      onChange({
        type: "table-options-cells",
        table: value.table,
        optionCells: OPTION_LETTERS.map((letter, i) => ({
          letter,
          row: Math.min(i + 1, rows - 1),
          col: Math.min(i + 1, cols - 1),
        })),
      });
    }
  }

  function setTable(table: TableBlock) {
    onChange({ ...value, table } as MCQOptions);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">Options on:</span>
        {(["rows", "cols", "cells"] as const).map((k) => (
          <button
            key={k}
            onClick={() => changeSubtype(k)}
            className={cn(
              "px-2 py-1 rounded text-xs font-bold border-2 transition-colors",
              subtype === k
                ? "border-primary text-primary bg-primary/10"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border p-2 bg-card">
        <h4 className="text-xs font-bold mb-2">Table</h4>
        <TableBuilder value={value.table} onChange={setTable} />
      </div>

      <div className="rounded-lg border border-border p-3 bg-card space-y-2">
        <h4 className="text-xs font-bold">Option ↔ {subtype}</h4>
        {value.type === "table-options-rows" && (
          <OptionMapper
            assignments={value.optionRows.map((r) => ({
              letter: r.letter,
              value: r.rowIndex,
              tags: r.tags,
            }))}
            max={rows - 1}
            label="Row"
            onChange={(list) =>
              onChange({
                ...value,
                optionRows: list.map((l) => ({
                  letter: l.letter,
                  rowIndex: l.value,
                  tags: l.tags,
                })),
              })
            }
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        )}
        {value.type === "table-options-cols" && (
          <OptionMapper
            assignments={value.optionCols.map((r) => ({
              letter: r.letter,
              value: r.colIndex,
              tags: r.tags,
            }))}
            max={cols - 1}
            label="Column"
            onChange={(list) =>
              onChange({
                ...value,
                optionCols: list.map((l) => ({
                  letter: l.letter,
                  colIndex: l.value,
                  tags: l.tags,
                })),
              })
            }
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        )}
        {value.type === "table-options-cells" && (
          <CellOptionMapper
            options={value.optionCells}
            rows={rows}
            cols={cols}
            onChange={(opts) => onChange({ ...value, optionCells: opts })}
            correctLetter={correctLetter}
            onCorrectLetterChange={onCorrectLetterChange}
          />
        )}
      </div>
    </div>
  );
}

export function emptyTableRowOptions(): TableRowOptionsMCQ {
  return {
    type: "table-options-rows",
    table: emptyTable(),
    optionRows: OPTION_LETTERS.map((letter, i) => ({ letter, rowIndex: i % 2 })),
  };
}

function OptionMapper({
  assignments,
  max,
  label,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: {
  assignments: { letter: OptionLetter; value: number; tags?: string[] }[];
  max: number;
  label: string;
  onChange: (next: { letter: OptionLetter; value: number; tags?: string[] }[]) => void;
  correctLetter: OptionLetter | null;
  onCorrectLetterChange: (l: OptionLetter | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      {assignments.map((a, i) => (
        <div key={a.letter} className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="tbl-correct"
              checked={correctLetter === a.letter}
              onChange={() => onCorrectLetterChange(a.letter)}
            />
            <span className="font-bold w-4">{a.letter}</span>
          </label>
          <span className="text-muted-foreground">{label} index:</span>
          <Input
            type="number"
            min={0}
            max={max}
            value={a.value}
            onChange={(e) => {
              const next = assignments.slice();
              next[i] = { ...a, value: Math.max(0, Math.min(max, Number(e.target.value) || 0)) };
              onChange(next);
            }}
            className="w-20 h-7"
          />
          <Input
            placeholder="tags"
            value={(a.tags ?? []).join(", ")}
            onChange={(e) => {
              const next = assignments.slice();
              next[i] = {
                ...a,
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              };
              onChange(next);
            }}
            className="flex-1 h-7"
          />
        </div>
      ))}
    </div>
  );
}

function CellOptionMapper({
  options,
  rows,
  cols,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: {
  options: TableCellOptionsMCQ["optionCells"];
  rows: number;
  cols: number;
  onChange: (next: TableCellOptionsMCQ["optionCells"]) => void;
  correctLetter: OptionLetter | null;
  onCorrectLetterChange: (l: OptionLetter | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((a, i) => (
        <div key={a.letter} className="flex items-center gap-2 text-xs flex-wrap">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="cell-correct"
              checked={correctLetter === a.letter}
              onChange={() => onCorrectLetterChange(a.letter)}
            />
            <span className="font-bold w-4">{a.letter}</span>
          </label>
          <span className="text-muted-foreground">row:</span>
          <Input
            type="number"
            min={0}
            max={rows - 1}
            value={a.row}
            onChange={(e) => {
              const next = options.slice();
              next[i] = { ...a, row: Math.max(0, Math.min(rows - 1, Number(e.target.value) || 0)) };
              onChange(next);
            }}
            className="w-16 h-7"
          />
          <span className="text-muted-foreground">col:</span>
          <Input
            type="number"
            min={0}
            max={cols - 1}
            value={a.col}
            onChange={(e) => {
              const next = options.slice();
              next[i] = { ...a, col: Math.max(0, Math.min(cols - 1, Number(e.target.value) || 0)) };
              onChange(next);
            }}
            className="w-16 h-7"
          />
          <Input
            placeholder="tags"
            value={(a.tags ?? []).join(", ")}
            onChange={(e) => {
              const next = options.slice();
              next[i] = {
                ...a,
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              };
              onChange(next);
            }}
            className="flex-1 h-7 min-w-[120px]"
          />
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Image-positioned (drag on image) ─────────────── */

export function ImagePositionedEditor({
  value,
  onChange,
  correctLetter,
  onCorrectLetterChange,
}: CommonProps & { value: ImagePositionedMCQ; onChange: (v: ImagePositionedMCQ) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragLetter, setDragLetter] = useState<OptionLetter | null>(null);

  function setOpt(letter: OptionLetter, patch: Partial<ImagePositionedMCQ["options"][number]>) {
    onChange({
      ...value,
      options: value.options.map((o) => (o.letter === letter ? { ...o, ...patch } : o)),
    });
  }
  function onMove(e: React.PointerEvent) {
    if (!dragLetter || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOpt(dragLetter, {
      x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)),
    });
  }

  const sizeClass =
    value.size === "sm" ? "max-w-[200px]" : value.size === "lg" ? "max-w-2xl" : "max-w-sm";
  const isDiagram = value.imageType === "Diagram";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="md:col-span-2 space-y-2">
          <ImageUploadButton
            label="Upload background image"
            onUploaded={(url) => onChange({ ...value, src: url, alt: value.alt ?? "" })}
          />
          <Input
            placeholder="Or paste image URL"
            value={value.src}
            onChange={(e) => onChange({ ...value, src: e.target.value })}
          />
        </div>
        <Input
          placeholder="Alt text"
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs space-y-1 block">
            <span>Image type</span>
            <Dropdown<string>
              size="sm"
              value={value.imageType ?? "Photograph"}
              onChange={(v) => onChange({ ...value, imageType: v as "Photograph" | "Diagram" })}
              options={[
                { value: "Photograph", label: "Photograph" },
                { value: "Diagram", label: "Diagram" },
              ]}
            />
          </label>
          <label className="text-xs space-y-1 block">
            <span>Size</span>
            <Dropdown<string>
              size="sm"
              value={value.size ?? "md"}
              onChange={(v) => onChange({ ...value, size: v as "sm" | "md" | "lg" })}
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border p-2 bg-card">
        <div className="text-[11px] text-muted-foreground mb-1">
          Drag any letter on the image to position it. The image is shown at the
          <strong> exact same size</strong> as on the live page so positions match precisely.
        </div>
        <div className={cn("mx-auto w-full", sizeClass)}>
          <div
            ref={containerRef}
            className={cn(
              "relative w-full rounded overflow-hidden select-none border-2 border-border/50 bg-card",
              isDiagram && "diagram-img",
            )}
            onPointerMove={onMove}
            onPointerUp={() => setDragLetter(null)}
            onPointerLeave={() => setDragLetter(null)}
          >
            {value.src ? (
              <img
                src={value.src}
                alt={value.alt}
                className={cn(
                  "w-full h-auto block pointer-events-none",
                  isDiagram && "mix-blend-multiply dark:mix-blend-screen dark:invert",
                )}
              />
            ) : (
              <div className="aspect-[16/10] grid place-items-center text-xs text-muted-foreground">
                Add an image URL above to start positioning options
              </div>
            )}
            {value.options.map((o) => (
              <button
                key={o.letter}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  setDragLetter(o.letter);
                }}
                style={{
                  left: `${o.x}%`,
                  top: `${o.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className={cn(
                  "absolute h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-grab active:cursor-grabbing shadow-lg",
                  correctLetter === o.letter
                    ? "bg-emerald-500 text-white border-emerald-700"
                    : "bg-primary text-primary-foreground border-primary-foreground/40",
                )}
              >
                {o.letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {value.options.map((o) => (
          <div key={o.letter} className="flex items-center gap-2 text-xs flex-wrap">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="pos-correct"
                checked={correctLetter === o.letter}
                onChange={() => onCorrectLetterChange(o.letter)}
              />
              <span className="font-bold w-4">{o.letter}</span>
            </label>
            <span className="text-muted-foreground">x%:</span>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={o.x}
              onChange={(e) =>
                setOpt(o.letter, { x: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
              }
              className="w-20 h-7"
            />
            <span className="text-muted-foreground">y%:</span>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={o.y}
              onChange={(e) =>
                setOpt(o.letter, { y: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
              }
              className="w-20 h-7"
            />
            <Input
              placeholder="label (optional)"
              value={
                o.label?.[0] && "runs" in o.label[0]
                  ? o.label[0].runs[0] && "text" in o.label[0].runs[0]
                    ? o.label[0].runs[0].text
                    : ""
                  : ""
              }
              onChange={(e) =>
                setOpt(o.letter, {
                  label: e.target.value
                    ? [{ kind: "p", runs: [{ type: "text", text: e.target.value }] }]
                    : undefined,
                })
              }
              className="flex-1 h-7 min-w-[120px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function emptyImagePositioned(): ImagePositionedMCQ {
  return {
    type: "image-positioned",
    src: "",
    alt: "",
    options: OPTION_LETTERS.map((letter, i) => ({
      letter,
      x: 25 + i * 15,
      y: 50,
    })),
  };
}

/* ─────────────── Shared bits ─────────────── */

function LayoutPicker({
  value,
  onChange,
}: {
  value: "vertical" | "horizontal" | "grid" | undefined;
  onChange: (v: "vertical" | "horizontal" | "grid") => void;
}) {
  return (
    <label className="text-xs flex items-center gap-2">
      Layout:
      <div className="w-40">
        <Dropdown<string>
          size="sm"
          value={value ?? "vertical"}
          onChange={(v) => onChange(v as "vertical" | "horizontal" | "grid")}
          options={[
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
            { value: "grid", label: "Grid (2x2)" },
          ]}
        />
      </div>
    </label>
  );
}

function OptionShell({
  letter,
  isCorrect,
  onMarkCorrect,
  tagsCsv,
  onTagsChange,
  children,
}: Pickable & {
  isCorrect: boolean;
  onMarkCorrect: () => void;
  tagsCsv: string;
  onTagsChange: (csv: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 space-y-2 bg-card transition-colors",
        isCorrect ? "border-emerald-500/60 bg-emerald-500/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">Option {letter}</span>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="radio" name="img-correct" checked={isCorrect} onChange={onMarkCorrect} />
          Correct answer
        </label>
      </div>
      {children}
      <Input
        placeholder="Tags (comma-separated)"
        value={tagsCsv}
        onChange={(e) => onTagsChange(e.target.value)}
      />
    </div>
  );
}

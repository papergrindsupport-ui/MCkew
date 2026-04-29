// Visual editor for TableBlock. Supports:
// - Rich-text caption
// - Column sub-groupings (header bands above the regular header row)
// - Row sub-groupings (label injected before a given row index)
// - Per-cell rich text, header flag, alignment, col/row span
// - Optional symbol/meaning key list
// - Add/remove rows + columns

import { LuPlus, LuTrash2, LuChevronUp, LuChevronDown } from "react-icons/lu";
import type { TableBlock, TableCell, RichText } from "@/data/questionData";
import { RichTextEditor } from "./PencilEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/admin/ui/Dropdown";
import { cn } from "@/lib/utils";

interface Props {
  value: TableBlock;
  onChange: (next: TableBlock) => void;
}

const emptyRich = (): RichText => [{ kind: "p", runs: [{ type: "text", text: "" }] }];
const emptyCell = (header = false): TableCell => ({
  content: emptyRich(),
  isHeader: header || undefined,
});

export function emptyTable(): TableBlock {
  return {
    type: "table",
    rows: [
      [emptyCell(true), emptyCell(true)],
      [emptyCell(), emptyCell()],
    ],
  };
}

export function TableBuilder({ value, onChange }: Props) {
  const cols = value.rows[0]?.length ?? 0;
  const rows = value.rows.length;

  function setRows(next: TableCell[][]) {
    onChange({ ...value, rows: next });
  }
  function setCell(r: number, c: number, patch: Partial<TableCell>) {
    const next = value.rows.map((row, i) =>
      i === r ? row.map((cell, j) => (j === c ? { ...cell, ...patch } : cell)) : row,
    );
    setRows(next);
  }
  function addRow(after = rows - 1) {
    const next = value.rows.slice();
    next.splice(
      after + 1,
      0,
      Array.from({ length: cols }, () => emptyCell()),
    );
    setRows(next);
  }
  function deleteRow(r: number) {
    if (rows <= 1) return;
    setRows(value.rows.filter((_, i) => i !== r));
  }
  function moveRow(r: number, dir: -1 | 1) {
    const j = r + dir;
    if (j < 0 || j >= rows) return;
    const next = value.rows.slice();
    [next[r], next[j]] = [next[j], next[r]];
    setRows(next);
  }
  function addCol(after = cols - 1) {
    const next = value.rows.map((row) => {
      const r = row.slice();
      r.splice(after + 1, 0, emptyCell(row[0]?.isHeader));
      return r;
    });
    setRows(next);
  }
  function deleteCol(c: number) {
    if (cols <= 1) return;
    setRows(value.rows.map((row) => row.filter((_, j) => j !== c)));
  }

  /* ─── Column groups ─── */
  const columnGroups = value.columnGroups ?? [];
  function addColumnGroup() {
    onChange({
      ...value,
      columnGroups: [...columnGroups, { label: emptyRich(), span: 1 }],
    });
  }
  function setColumnGroup(i: number, patch: Partial<{ label: RichText; span: number }>) {
    const next = columnGroups.map((g, k) => (k === i ? { ...g, ...patch } : g));
    onChange({ ...value, columnGroups: next });
  }
  function removeColumnGroup(i: number) {
    onChange({ ...value, columnGroups: columnGroups.filter((_, k) => k !== i) });
  }

  /* ─── Row groups ─── */
  const rowGroups = value.rowGroups ?? [];
  function addRowGroup() {
    onChange({
      ...value,
      rowGroups: [...rowGroups, { startRow: 0, label: emptyRich() }],
    });
  }
  function setRowGroup(i: number, patch: Partial<{ startRow: number; label: RichText }>) {
    const next = rowGroups.map((g, k) => (k === i ? { ...g, ...patch } : g));
    onChange({ ...value, rowGroups: next });
  }
  function removeRowGroup(i: number) {
    onChange({ ...value, rowGroups: rowGroups.filter((_, k) => k !== i) });
  }

  /* ─── Key entries ─── */
  const keyEntries = value.key ?? [];
  function addKey() {
    onChange({ ...value, key: [...keyEntries, { symbol: "", meaning: emptyRich() }] });
  }
  function setKey(i: number, patch: Partial<{ symbol: string; meaning: RichText }>) {
    onChange({
      ...value,
      key: keyEntries.map((k, idx) => (idx === i ? { ...k, ...patch } : k)),
    });
  }
  function removeKey(i: number) {
    onChange({ ...value, key: keyEntries.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      {/* Caption */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Caption</label>
        <RichTextEditor
          minimal
          value={value.caption ?? []}
          onChange={(v) => onChange({ ...value, caption: v })}
          placeholder="Optional table caption…"
        />
      </div>

      {/* Column groups */}
      <div className="rounded border border-border p-2 bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold">Column groups (sub-headers above main columns)</span>
          <Button size="sm" variant="outline" onClick={addColumnGroup}>
            <LuPlus size={12} /> Add
          </Button>
        </div>
        {columnGroups.length === 0 && (
          <p className="text-[11px] text-muted-foreground">None. Spans must add up to {cols}.</p>
        )}
        <div className="space-y-1.5">
          {columnGroups.map((g, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="flex-1">
                <RichTextEditor
                  minimal
                  value={g.label}
                  onChange={(v) => setColumnGroup(i, { label: v })}
                  placeholder="Group label"
                />
              </div>
              <Input
                type="number"
                min={1}
                max={cols}
                value={g.span}
                onChange={(e) =>
                  setColumnGroup(i, { span: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-16"
              />
              <Button size="icon" variant="ghost" onClick={() => removeColumnGroup(i)}>
                <LuTrash2 size={12} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Row groups */}
      <div className="rounded border border-border p-2 bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold">Row groups (sub-headings between rows)</span>
          <Button size="sm" variant="outline" onClick={addRowGroup}>
            <LuPlus size={12} /> Add
          </Button>
        </div>
        <div className="space-y-1.5">
          {rowGroups.map((g, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Input
                type="number"
                min={0}
                max={rows - 1}
                value={g.startRow}
                onChange={(e) =>
                  setRowGroup(i, { startRow: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-16"
                title="Inserted before this row index"
              />
              <div className="flex-1">
                <RichTextEditor
                  minimal
                  value={g.label}
                  onChange={(v) => setRowGroup(i, { label: v })}
                  placeholder="Group label"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeRowGroup(i)}>
                <LuTrash2 size={12} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* The grid */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse">
          <tbody>
            {value.rows.map((row, r) => (
              <tr key={r}>
                <td className="bg-muted/40 border border-border p-1 text-center w-7 align-top">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">R{r}</span>
                    <button
                      title="Move up"
                      onClick={() => moveRow(r, -1)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <LuChevronUp size={10} />
                    </button>
                    <button
                      title="Move down"
                      onClick={() => moveRow(r, +1)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <LuChevronDown size={10} />
                    </button>
                    <button
                      title="Delete row"
                      onClick={() => deleteRow(r)}
                      className="p-0.5 hover:bg-destructive/20 text-destructive rounded"
                    >
                      <LuTrash2 size={10} />
                    </button>
                  </div>
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "border border-border p-1 align-top min-w-[120px]",
                      cell.isHeader && "bg-muted/30",
                    )}
                  >
                    <RichTextEditor
                      minimal
                      value={cell.content}
                      onChange={(v) => setCell(r, c, { content: v })}
                      placeholder="cell"
                    />
                    <div className="flex items-center gap-1 mt-1 text-[10px]">
                      <label className="flex items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={!!cell.isHeader}
                          onChange={(e) =>
                            setCell(r, c, { isHeader: e.target.checked || undefined })
                          }
                        />
                        H
                      </label>
                      <div className="w-12">
                        <Dropdown<string>
                          size="sm"
                          value={cell.align ?? "left"}
                          onChange={(v) =>
                            setCell(r, c, { align: v as "left" | "center" | "right" })
                          }
                          options={[
                            { value: "left", label: "L" },
                            { value: "center", label: "C" },
                            { value: "right", label: "R" },
                          ]}
                        />
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={cell.colSpan ?? 1}
                        onChange={(e) =>
                          setCell(r, c, {
                            colSpan: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        title="colSpan"
                        className="h-5 w-10 text-[10px] px-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={cell.rowSpan ?? 1}
                        onChange={(e) =>
                          setCell(r, c, {
                            rowSpan: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        title="rowSpan"
                        className="h-5 w-10 text-[10px] px-1"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td colSpan={cols + 1} className="bg-muted/20 border border-border p-1 text-center">
                <Button size="sm" variant="ghost" onClick={() => addRow(rows - 1)}>
                  <LuPlus size={12} /> Add row
                </Button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td />
              {value.rows[0]?.map((_, c) => (
                <td key={c} className="bg-muted/20 border border-border p-1 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">C{c}</span>
                    <button
                      onClick={() => deleteCol(c)}
                      title="Delete column"
                      className="p-0.5 hover:bg-destructive/20 text-destructive rounded"
                    >
                      <LuTrash2 size={10} />
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => addCol(cols - 1)}>
          <LuPlus size={12} /> Add column
        </Button>
      </div>

      {/* Key entries */}
      <div className="rounded border border-border p-2 bg-muted/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold">Key (symbol → meaning)</span>
          <Button size="sm" variant="outline" onClick={addKey}>
            <LuPlus size={12} /> Add
          </Button>
        </div>
        <div className="space-y-1.5">
          {keyEntries.map((k, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Input
                value={k.symbol}
                onChange={(e) => setKey(i, { symbol: e.target.value })}
                placeholder="✓"
                className="w-16"
              />
              <div className="flex-1">
                <RichTextEditor
                  minimal
                  value={k.meaning}
                  onChange={(v) => setKey(i, { meaning: v })}
                  placeholder="Meaning"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeKey(i)}>
                <LuTrash2 size={12} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

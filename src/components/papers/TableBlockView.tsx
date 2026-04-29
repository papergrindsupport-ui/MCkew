import { cn } from "@/lib/utils";
import type { TableBlock } from "@/data/questionData";
import { RichTextInline, RichTextView } from "./RichTextView";

export function TableBlockView({ block }: { block: TableBlock }) {
  const colCount = Math.max(
    ...block.rows.map((r) => r.reduce((sum, c) => sum + (c.colSpan ?? 1), 0)),
  );

  return (
    <div className="my-2 overflow-x-auto">
      {block.caption && (
        <div className="text-sm text-muted-foreground mb-2">
          <RichTextInline rich={block.caption} />
        </div>
      )}
      <table className="w-full border-collapse text-sm rounded-xl overflow-hidden border-2 border-border/60">
        {block.columnGroups && (
          <thead>
            <tr className="bg-primary/10">
              {block.columnGroups.map((g, gi) => (
                <th
                  key={gi}
                  colSpan={g.span}
                  className="border border-border/40 px-3 py-2 font-bold text-foreground"
                >
                  <RichTextInline rich={g.label} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {block.rows.map((row, ri) => {
            const groupLabel = block.rowGroups?.find((g) => g.startRow === ri);
            return (
              <>
                {groupLabel && (
                  <tr key={`g-${ri}`} className="bg-secondary/40">
                    <td
                      colSpan={colCount}
                      className="border border-border/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      <RichTextInline rich={groupLabel.label} />
                    </td>
                  </tr>
                )}
                <tr key={ri} className={cn(ri === 0 && "bg-muted/40")}>
                  {row.map((cell, ci) => {
                    const Tag = cell.isHeader ? "th" : "td";
                    return (
                      <Tag
                        key={ci}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        className={cn(
                          "border border-border/40 px-3 py-2 align-top",
                          cell.isHeader && "font-bold bg-muted/60 text-foreground",
                          cell.align === "center" && "text-center",
                          cell.align === "right" && "text-right",
                        )}
                      >
                        <RichTextInline rich={cell.content} />
                      </Tag>
                    );
                  })}
                </tr>
              </>
            );
          })}
        </tbody>
      </table>

      {block.key && block.key.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-bold uppercase tracking-wider">Key:</span>
          {block.key.map((k, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="font-bold text-foreground">{k.symbol}</span>
              <span>=</span>
              <RichTextInline rich={k.meaning} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

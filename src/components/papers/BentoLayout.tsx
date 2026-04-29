import { useMemo } from "react";
import type { Paper } from "@/data/paperData";
import { PaperCard } from "./PaperCard";
import { cn } from "@/lib/utils";

/**
 * Real responsive bento grid.
 *
 * Strategy:
 *  - Choose a column count per breakpoint (mobile=2, sm=4, lg=6, xl=8).
 *  - Each tile has a (w, h) in cells, derived from `paper.bentoSize` but
 *    ALWAYS clamped to the current column count so nothing overflows.
 *  - Pack greedily into the leftmost free slot. After packing, expand the
 *    last tile in any partially-filled trailing row so the grid is flush
 *    edge-to-edge with no holes.
 *
 * We render three independent grids (one per breakpoint) so each layout is
 * truly optimised for its width, then show/hide via Tailwind responsive utils.
 * Cheap because tile counts are small.
 */

type Size = { w: number; h: number };

const SIZE_PRESETS: Record<Paper["bentoSize"], Size> = {
  sm: { w: 1, h: 1 },
  md: { w: 2, h: 1 },
  lg: { w: 2, h: 2 },
  xl: { w: 3, h: 2 },
};

interface Placed {
  paper: Paper;
  col: number; // 0-indexed
  row: number;
  w: number;
  h: number;
}

function pack(papers: Paper[], cols: number): Placed[] {
  const grid: boolean[][] = [];
  const ensure = (r: number) => {
    while (grid.length <= r) grid.push(new Array(cols).fill(false));
  };
  const fits = (r: number, c: number, w: number, h: number) => {
    if (c + w > cols) return false;
    for (let dr = 0; dr < h; dr++) {
      ensure(r + dr);
      for (let dc = 0; dc < w; dc++) if (grid[r + dr][c + dc]) return false;
    }
    return true;
  };
  const fill = (r: number, c: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) grid[r + dr][c + dc] = true;
  };

  const placed: Placed[] = [];
  for (const p of papers) {
    const preset = SIZE_PRESETS[p.bentoSize];
    // Clamp to current cols. On narrow screens, large tiles shrink gracefully.
    const w = Math.min(preset.w, cols);
    const h = preset.h;
    let r = 0;
    let done = false;
    while (!done) {
      ensure(r);
      for (let c = 0; c <= cols - w; c++) {
        if (fits(r, c, w, h)) {
          fill(r, c, w, h);
          placed.push({ paper: p, col: c, row: r, w, h });
          done = true;
          break;
        }
      }
      if (!done) r++;
    }
  }

  // Stretch tiles to fill leftover holes (keeps grid edge-to-edge).
  const totalRows = grid.length;
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) {
        // Find a placed tile on this row whose right edge touches `c`.
        const candidate = [...placed]
          .reverse()
          .find((pl) => pl.row <= r && pl.row + pl.h > r && pl.col + pl.w === c);
        if (candidate) {
          // Try extending its width by 1 if all rows it spans have free slot.
          let canExtend = candidate.col + candidate.w + 1 <= cols;
          if (canExtend) {
            for (let dr = 0; dr < candidate.h; dr++) {
              if (grid[candidate.row + dr][candidate.col + candidate.w]) {
                canExtend = false;
                break;
              }
            }
          }
          if (canExtend) {
            for (let dr = 0; dr < candidate.h; dr++) {
              grid[candidate.row + dr][candidate.col + candidate.w] = true;
            }
            candidate.w += 1;
          }
        }
      }
    }
  }

  return placed;
}

function GridFor({
  papers,
  cols,
  className,
  selection,
}: {
  papers: Paper[];
  cols: number;
  className: string;
  selection?: PaperSelection;
}) {
  const placed = useMemo(() => pack(papers, cols), [papers, cols]);
  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3 auto-rows-[110px] sm:auto-rows-[130px] lg:auto-rows-[140px]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {placed.map((p) => (
        <div
          key={p.paper.id}
          style={{
            gridColumnStart: p.col + 1,
            gridColumnEnd: `span ${p.w}`,
            gridRowStart: p.row + 1,
            gridRowEnd: `span ${p.h}`,
          }}
        >
          <PaperCard
            paper={p.paper}
            className="h-full"
            compact={p.h === 1}
            selection={
              selection && {
                active: selection.active,
                selected: selection.selectedIds.has(p.paper.id),
                onToggle: () => selection.onToggle(p.paper.id),
              }
            }
          />
        </div>
      ))}
    </div>
  );
}

type PaperSelection = {
  active: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export function BentoLayout({
  papers,
  selection,
}: {
  papers: Paper[];
  selection?: PaperSelection;
}) {
  if (papers.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">No papers match your filters ✨</div>
    );
  }
  return (
    <>
      <GridFor papers={papers} cols={2} className="block sm:hidden" selection={selection} />
      <GridFor
        papers={papers}
        cols={4}
        className="hidden sm:grid lg:hidden"
        selection={selection}
      />
      <GridFor
        papers={papers}
        cols={6}
        className="hidden lg:grid xl:hidden"
        selection={selection}
      />
      <GridFor papers={papers} cols={8} className="hidden xl:grid" selection={selection} />
    </>
  );
}

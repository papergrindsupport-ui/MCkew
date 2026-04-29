// Visual graph builder. Drag points/bars on an SVG plot, edit values manually,
// add/remove series and points, switch chart kind (bar/line/pie), line style,
// axis labels, title, and legend. Also shows a live preview using ChartBlockView.

import { useMemo, useRef, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { ChartBlock, ChartKind, ChartSeries, LineStyle, RichText } from "@/data/questionData";
import { RichTextEditor } from "./PencilEditor";
import { ChartBlockView } from "@/components/papers/ChartBlockView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/admin/ui/Dropdown";
import { cn } from "@/lib/utils";

interface Props {
  value: ChartBlock;
  onChange: (next: ChartBlock) => void;
}

const PLOT_W = 380;
const PLOT_H = 220;
const PAD = 30;

const SERIES_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 70% 50%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 60% 60%))",
];

const emptyRich = (): RichText => [{ kind: "p", runs: [{ type: "text", text: "" }] }];

export function emptyChart(kind: ChartKind = "bar"): ChartBlock {
  return {
    type: "chart",
    chart: kind,
    title: emptyRich(),
    xLabel: "x",
    yLabel: "y",
    showLegend: true,
    series: [
      {
        name: "Series 1",
        lineStyle: kind === "line" ? "smooth" : undefined,
        data:
          kind === "pie"
            ? [
                { x: "A", y: 30 },
                { x: "B", y: 40 },
                { x: "C", y: 30 },
              ]
            : [
                { x: 0, y: 10 },
                { x: 1, y: 25 },
                { x: 2, y: 18 },
                { x: 3, y: 32 },
              ],
      },
    ],
  };
}

export function GraphBuilder({ value, onChange }: Props) {
  function setField<K extends keyof ChartBlock>(k: K, v: ChartBlock[K]) {
    onChange({ ...value, [k]: v });
  }
  function setSeries(idx: number, patch: Partial<ChartSeries>) {
    const next = value.series.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...value, series: next });
  }
  function addSeries() {
    const idx = value.series.length;
    onChange({
      ...value,
      series: [
        ...value.series,
        {
          name: `Series ${idx + 1}`,
          lineStyle: value.chart === "line" ? "smooth" : undefined,
          data: value.series[0]?.data.map((d) => ({ x: d.x, y: 0 })) ?? [],
        },
      ],
    });
  }
  function removeSeries(idx: number) {
    if (value.series.length <= 1) return;
    onChange({ ...value, series: value.series.filter((_, i) => i !== idx) });
  }

  function setPoint(sIdx: number, pIdx: number, patch: Partial<{ x: string | number; y: number }>) {
    const next = value.series.map((s, i) => {
      if (i !== sIdx) return s;
      return {
        ...s,
        data: s.data.map((d, j) => (j === pIdx ? { ...d, ...patch } : d)),
      };
    });
    onChange({ ...value, series: next });
  }
  function addPoint(sIdx: number) {
    const next = value.series.map((s, i) => {
      if (i !== sIdx) return s;
      const last = s.data[s.data.length - 1];
      const nextX = typeof last?.x === "number" ? last.x + 1 : `Item ${s.data.length + 1}`;
      return { ...s, data: [...s.data, { x: nextX, y: 0 }] };
    });
    onChange({ ...value, series: next });
  }
  function removePoint(sIdx: number, pIdx: number) {
    const next = value.series.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, data: s.data.filter((_, j) => j !== pIdx) };
    });
    onChange({ ...value, series: next });
  }

  return (
    <div className="space-y-3">
      {/* Top controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="text-xs space-y-1 block">
          <span>Chart kind</span>
          <Dropdown<string>
            size="sm"
            value={value.chart}
            onChange={(v) => {
              const kind = v as ChartKind;
              const series = value.series.map((s) => ({
                ...s,
                lineStyle: kind === "line" ? (s.lineStyle ?? "smooth") : undefined,
              }));
              onChange({ ...value, chart: kind, series });
            }}
            options={[
              { value: "bar", label: "Bar" },
              { value: "line", label: "Line" },
              { value: "pie", label: "Pie" },
            ]}
          />
        </label>
        <label className="text-xs">
          X axis label
          <Input value={value.xLabel ?? ""} onChange={(e) => setField("xLabel", e.target.value)} />
        </label>
        <label className="text-xs">
          Y axis label
          <Input value={value.yLabel ?? ""} onChange={(e) => setField("yLabel", e.target.value)} />
        </label>
        <label className="text-xs flex items-center gap-1.5 mt-4">
          <input
            type="checkbox"
            checked={value.showLegend ?? true}
            onChange={(e) => setField("showLegend", e.target.checked)}
          />
          Show legend
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Title</label>
        <RichTextEditor
          minimal
          value={value.title ?? []}
          onChange={(v) => setField("title", v)}
          placeholder="Optional title"
        />
      </div>

      {/* Drag plot */}
      {value.chart !== "pie" && (
        <DraggablePlot value={value} onPointMove={(s, p, x, y) => setPoint(s, p, { x, y })} />
      )}

      {/* Series */}
      <div className="space-y-2">
        {value.series.map((s, sIdx) => (
          <div key={sIdx} className="rounded-lg border border-border p-2 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full inline-block border border-border"
                style={{ background: SERIES_COLORS[sIdx % SERIES_COLORS.length] }}
              />
              <Input
                value={s.name}
                onChange={(e) => setSeries(sIdx, { name: e.target.value })}
                className="flex-1"
              />
              {value.chart === "line" && (
                <div className="w-44">
                  <Dropdown<string>
                    size="sm"
                    value={s.lineStyle ?? "smooth"}
                    onChange={(v) => setSeries(sIdx, { lineStyle: v as LineStyle })}
                    options={[
                      { value: "smooth", label: "Smooth curve" },
                      { value: "straight", label: "Straight (point-to-point)" },
                      { value: "best-fit", label: "Best-fit line" },
                    ]}
                  />
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeSeries(sIdx)}
                disabled={value.series.length <= 1}
              >
                <LuTrash2 size={12} className="text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-1 text-xs items-center">
              <span className="font-mono text-muted-foreground px-1">#</span>
              <span className="font-mono text-muted-foreground px-1">x</span>
              <span className="font-mono text-muted-foreground px-1">y</span>
              <span />
              {s.data.map((d, pIdx) => (
                <PointRow
                  key={pIdx}
                  index={pIdx}
                  x={d.x}
                  y={d.y}
                  onChange={(patch) => setPoint(sIdx, pIdx, patch)}
                  onRemove={() => removePoint(sIdx, pIdx)}
                  numericX={typeof d.x === "number"}
                />
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <Button size="sm" variant="outline" onClick={() => addPoint(sIdx)}>
                <LuPlus size={12} /> Point
              </Button>
              <label className="text-[11px] flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={typeof s.data[0]?.x === "number"}
                  onChange={(e) => {
                    const numeric = e.target.checked;
                    setSeries(sIdx, {
                      data: s.data.map((d, i) => ({
                        x: numeric ? Number(d.x) || i : String(d.x),
                        y: d.y,
                      })),
                    });
                  }}
                />
                numeric x
              </label>
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addSeries}>
          <LuPlus size={12} /> Add series
        </Button>
      </div>

      {/* Live preview */}
      <details className="rounded border border-border" open>
        <summary className="cursor-pointer px-2 py-1.5 text-xs font-bold bg-muted/40">
          Live preview
        </summary>
        <div className="p-2">
          <ChartBlockView block={value} />
        </div>
      </details>
    </div>
  );
}

function PointRow({
  index,
  x,
  y,
  onChange,
  onRemove,
  numericX,
}: {
  index: number;
  x: string | number;
  y: number;
  onChange: (patch: Partial<{ x: string | number; y: number }>) => void;
  onRemove: () => void;
  numericX: boolean;
}) {
  return (
    <>
      <span className="font-mono text-[11px] text-muted-foreground px-1">{index}</span>
      <Input
        value={String(x)}
        onChange={(e) => onChange({ x: numericX ? Number(e.target.value) || 0 : e.target.value })}
        className="h-7 text-xs"
      />
      <Input
        type="number"
        value={y}
        onChange={(e) => onChange({ y: Number(e.target.value) || 0 })}
        className="h-7 text-xs"
      />
      <Button size="icon" variant="ghost" onClick={onRemove} className="h-7 w-7">
        <LuTrash2 size={11} className="text-destructive" />
      </Button>
    </>
  );
}

/* ─────────────── Draggable SVG plot ─────────────── */

function DraggablePlot({
  value,
  onPointMove,
}: {
  value: ChartBlock;
  onPointMove: (sIdx: number, pIdx: number, newX: string | number, newY: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ sIdx: number; pIdx: number } | null>(null);

  // Compute bounds across all series
  const { yMin, yMax, xMin, xMax, allNumeric, xLabels } = useMemo(() => {
    const ys = value.series.flatMap((s) => s.data.map((d) => d.y));
    const xs = value.series.flatMap((s) => s.data.map((d) => d.x));
    const allNumeric = xs.every((x) => typeof x === "number");
    const yMin = Math.min(0, ...ys);
    let yMax = Math.max(...ys, 1);
    if (yMax === yMin) yMax = yMin + 1;
    // pad y
    const pad = (yMax - yMin) * 0.1;
    yMax += pad;
    let xMin = 0,
      xMax = 1;
    let xLabels: (string | number)[] = [];
    if (allNumeric) {
      xMin = Math.min(...(xs as number[]));
      xMax = Math.max(...(xs as number[]));
      if (xMax === xMin) xMax = xMin + 1;
    } else {
      // Use index 0..(n-1) for the longest series
      const longest = Math.max(...value.series.map((s) => s.data.length));
      xMin = 0;
      xMax = Math.max(0, longest - 1);
      xLabels = value.series[0]?.data.map((d) => d.x) ?? [];
    }
    return { yMin, yMax, xMin, xMax, allNumeric, xLabels };
  }, [value.series]);

  function dataToPx(x: number, y: number) {
    const px = PAD + ((x - xMin) / Math.max(0.0001, xMax - xMin)) * (PLOT_W - 2 * PAD);
    const py = PLOT_H - PAD - ((y - yMin) / Math.max(0.0001, yMax - yMin)) * (PLOT_H - 2 * PAD);
    return { px, py };
  }
  function pxToData(px: number, py: number) {
    const x = xMin + ((px - PAD) / (PLOT_W - 2 * PAD)) * (xMax - xMin);
    const y = yMin + ((PLOT_H - PAD - py) / (PLOT_H - 2 * PAD)) * (yMax - yMin);
    return { x, y };
  }

  function onMove(e: React.PointerEvent) {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PLOT_W;
    const py = ((e.clientY - rect.top) / rect.height) * PLOT_H;
    const { x, y } = pxToData(px, py);
    const orig = value.series[drag.sIdx]?.data[drag.pIdx];
    if (!orig) return;
    const newX = typeof orig.x === "number" ? Math.round(x * 100) / 100 : orig.x;
    const newY = Math.round(y * 100) / 100;
    onPointMove(drag.sIdx, drag.pIdx, newX, newY);
  }

  return (
    <div className="rounded border border-border p-2 bg-card">
      <div className="text-[11px] text-muted-foreground mb-1">
        Drag the points{value.chart === "bar" ? " or the top of any bar" : ""} to reshape the graph.
        Values update live.
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        className="w-full h-auto bg-background rounded select-none touch-none"
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {/* Axes */}
        <line
          x1={PAD}
          y1={PLOT_H - PAD}
          x2={PLOT_W - PAD}
          y2={PLOT_H - PAD}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={PLOT_H - PAD}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
        {/* Y ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PLOT_H - PAD - t * (PLOT_H - 2 * PAD);
          const v = (yMin + t * (yMax - yMin)).toFixed(1);
          return (
            <g key={t}>
              <line
                x1={PAD - 3}
                x2={PLOT_W - PAD}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeDasharray="2 3"
              />
              <text
                x={PAD - 5}
                y={y + 3}
                fontSize={9}
                textAnchor="end"
                fill="hsl(var(--muted-foreground))"
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* X ticks */}
        {(allNumeric
          ? [0, 0.25, 0.5, 0.75, 1]
          : xLabels.map((_, i) => i / Math.max(1, xLabels.length - 1))
        ).map((t, i) => {
          const x = PAD + t * (PLOT_W - 2 * PAD);
          const v = allNumeric ? (xMin + t * (xMax - xMin)).toFixed(1) : String(xLabels[i] ?? "");
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={PLOT_H - PAD}
                y2={PLOT_H - PAD + 3}
                stroke="hsl(var(--muted-foreground))"
              />
              <text
                x={x}
                y={PLOT_H - PAD + 12}
                fontSize={9}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Series */}
        {value.series.map((s, sIdx) => {
          const color = SERIES_COLORS[sIdx % SERIES_COLORS.length];
          if (value.chart === "line") {
            const pts = s.data.map((d, i) => {
              const xVal = typeof d.x === "number" ? d.x : i;
              return dataToPx(xVal, d.y);
            });
            const path = pts
              .map((p, i) => (i === 0 ? `M ${p.px} ${p.py}` : `L ${p.px} ${p.py}`))
              .join(" ");
            return (
              <g key={sIdx}>
                <path d={path} stroke={color} strokeWidth={1.5} fill="none" />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.px}
                    cy={p.py}
                    r={5}
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as SVGElement).setPointerCapture?.(e.pointerId);
                      setDrag({ sIdx, pIdx: i });
                    }}
                  />
                ))}
              </g>
            );
          }
          // Bar
          const barW = Math.max(
            6,
            (PLOT_W - 2 * PAD) / Math.max(1, s.data.length) / value.series.length - 4,
          );
          return (
            <g key={sIdx}>
              {s.data.map((d, i) => {
                const xVal = typeof d.x === "number" ? d.x : i;
                const { px } = dataToPx(xVal, 0);
                const top = dataToPx(0, d.y).py;
                const base = dataToPx(0, 0).py;
                const x = px - barW / 2 + sIdx * (barW + 2);
                const y = Math.min(top, base);
                const h = Math.abs(base - top);
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barW} height={h} fill={color} opacity={0.85} />
                    <rect
                      x={x}
                      y={y - 4}
                      width={barW}
                      height={8}
                      fill={color}
                      className="cursor-ns-resize"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        (e.target as SVGElement).setPointerCapture?.(e.pointerId);
                        setDrag({ sIdx, pIdx: i });
                      }}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Hooks the cn helper to silence unused-import warnings if any */
export { cn as _cn };

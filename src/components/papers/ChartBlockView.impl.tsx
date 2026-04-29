import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
} from "recharts";
import type { ChartBlock } from "@/data/questionData";
import { RichTextInline } from "./RichTextView";

// Theme-aware palette using CSS variables (HSL strings).
const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 70% 50%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 60% 60%))",
];

function mergeData(series: ChartBlock["series"]) {
  // Merge series by x-axis for shared XAxis on line/bar charts.
  const map = new Map<string | number, Record<string, unknown>>();
  series.forEach((s) => {
    s.data.forEach((d) => {
      const cur = map.get(d.x) ?? { x: d.x };
      cur[s.name] = d.y;
      map.set(d.x, cur);
    });
  });
  return Array.from(map.values()).sort((a, b) => {
    const ax = a.x,
      bx = b.x;
    if (typeof ax === "number" && typeof bx === "number") return ax - bx;
    return String(ax).localeCompare(String(bx));
  });
}

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
};

export function ChartBlockView({ block }: { block: ChartBlock }) {
  return (
    <div className="my-2 w-full bg-card rounded-xl border-2 border-border/40 p-3">
      {block.title && (
        <div className="mb-1 text-sm">
          <RichTextInline rich={block.title} />
        </div>
      )}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {block.chart === "pie" ? (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              {block.showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
              <Pie
                data={block.series[0].data}
                dataKey="y"
                nameKey="x"
                outerRadius="75%"
                label={(e: { x: string | number; y: number }) => `${e.x}: ${e.y}`}
              >
                {block.series[0].data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : block.chart === "bar" ? (
            <BarChart
              data={mergeData(block.series)}
              margin={{ top: 10, right: 10, left: 0, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" {...axisProps}>
                {block.xLabel && (
                  <Label
                    value={block.xLabel}
                    offset={-12}
                    position="insideBottom"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                )}
              </XAxis>
              <YAxis {...axisProps}>
                {block.yLabel && (
                  <Label
                    value={block.yLabel}
                    angle={-90}
                    position="insideLeft"
                    style={{ textAnchor: "middle" }}
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                )}
              </YAxis>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              {block.showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {block.series.map((s, i) => (
                <Bar
                  key={s.name}
                  dataKey={s.name}
                  fill={PALETTE[i % PALETTE.length]}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart
              data={mergeData(block.series)}
              margin={{ top: 10, right: 10, left: 0, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" {...axisProps} type="number" domain={["dataMin", "dataMax"]}>
                {block.xLabel && (
                  <Label
                    value={block.xLabel}
                    offset={-12}
                    position="insideBottom"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                )}
              </XAxis>
              <YAxis {...axisProps}>
                {block.yLabel && (
                  <Label
                    value={block.yLabel}
                    angle={-90}
                    position="insideLeft"
                    style={{ textAnchor: "middle" }}
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                )}
              </YAxis>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              {block.showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {block.series.map((s, i) => {
                const lineType =
                  s.lineStyle === "smooth"
                    ? "monotone"
                    : s.lineStyle === "best-fit"
                      ? "basis"
                      : "linear";
                return (
                  <Line
                    key={s.name}
                    type={lineType}
                    dataKey={s.name}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2.5}
                    dot={s.lineStyle !== "best-fit" ? { r: 3 } : false}
                    activeDot={{ r: 5 }}
                    isAnimationActive
                  />
                );
              })}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

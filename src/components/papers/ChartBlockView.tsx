import { lazy, Suspense } from "react";
import type { ChartBlock } from "@/data/questionData";

// Lazy chunk so the heavy `recharts` library is only downloaded when a
// question / option actually contains a chart block. Keeps the main paper
// bundle (QuestionView) small.
const ChartBlockViewInner = lazy(() =>
  import("./ChartBlockView.impl").then((m) => ({ default: m.ChartBlockView })),
);

function ChartFallback() {
  return (
    <div
      className="my-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
      style={{ height: 220 }}
    >
      Loading chart…
    </div>
  );
}

export function ChartBlockView({ block }: { block: ChartBlock }) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <ChartBlockViewInner block={block} />
    </Suspense>
  );
}

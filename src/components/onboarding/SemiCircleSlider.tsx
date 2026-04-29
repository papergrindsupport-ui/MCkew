// Fun semi-circle slider used in the onboarding wizard. User can drag the
// handle along a 180° arc or click one of the labeled dots to snap to it.

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

export interface SliderStop {
  value: number;
  label: string;
}

interface Props {
  value: number;
  onChange: (v: number) => void;
  stops: SliderStop[];
  icon: React.ReactNode;
  /** Allow arbitrary in-between values (true by default) or snap to stops. */
  allowBetween?: boolean;
  /** Min / max override; defaults to first/last stop. */
  min?: number;
  max?: number;
  width?: number;
}

export function SemiCircleSlider({
  value,
  onChange,
  stops,
  icon,
  allowBetween = true,
  min,
  max,
  width = 420,
}: Props) {
  const arcHeight = width / 2 + 30;
  const cx = width / 2;
  const cy = width / 2;
  const r = width / 2 - 20;
  const stroke = 14;

  const minV = min ?? stops[0].value;
  const maxV = max ?? stops[stops.length - 1].value;

  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const valToAngle = (v: number) => {
    const t = (v - minV) / Math.max(1, maxV - minV);
    // 180° (left) -> 0° (right). Map t 0..1 to 180..0
    return Math.PI - t * Math.PI;
  };
  const angleToVal = (a: number) => {
    const clamped = Math.max(0, Math.min(Math.PI, a));
    const t = 1 - clamped / Math.PI;
    const raw = minV + t * (maxV - minV);
    if (!allowBetween) {
      let best = stops[0];
      for (const s of stops) if (Math.abs(s.value - raw) < Math.abs(best.value - raw)) best = s;
      return best.value;
    }
    return Math.round(raw);
  };

  const pointAt = (v: number) => {
    const a = valToAngle(v);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  // Arc path: start (left) to end (right), semi-circle.
  const start = pointAt(minV);
  const end = pointAt(maxV);
  const arcPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

  // Filled portion from start -> current value
  const cur = pointAt(value);
  const largeArc = 0;
  const filledPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${cur.x} ${cur.y}`;

  const handlePointer = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * arcHeight;
      const dx = px - cx;
      const dy = cy - py; // y inverted
      const a = Math.atan2(dy, dx);
      onChange(angleToVal(a));
    },
    [cx, cy, onChange, width, arcHeight],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => handlePointer(e);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, handlePointer]);

  // Find label for tooltip
  const currentStop = [...stops].reduce((best, s) =>
    Math.abs(s.value - value) < Math.abs(best.value - value) ? s : best,
  );
  const tooltipPos = pointAt(value);

  return (
    <div className="relative w-full flex justify-center select-none">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${arcHeight}`}
        className="touch-none"
        style={{ maxWidth: width, overflow: "visible" }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          handlePointer(e);
        }}
      >
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={filledPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ d: filledPath }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
        {/* Stop dots */}
        {stops.map((s) => {
          const p = pointAt(s.value);
          const active = value >= s.value - 0.0001;
          const isCurrent = Math.abs(s.value - value) < (maxV - minV) * 0.04;
          return (
            <g
              key={s.value}
              style={{ cursor: "pointer" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onChange(s.value);
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isCurrent ? 10 : 8}
                fill={isCurrent ? "hsl(var(--primary))" : "hsl(var(--card))"}
                stroke={active ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={2.5}
              />
              <text
                x={p.x}
                y={p.y + 28}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={14}
                fontWeight={700}
              >
                {s.value}
              </text>
              <text
                x={p.x}
                y={p.y + 44}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={11}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip bubble */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: `${(tooltipPos.x / width) * 100}%`,
          top: `${(tooltipPos.y / arcHeight) * 100}%`,
          transform: "translate(-50%, calc(-100% - 20px))",
        }}
        animate={{ scale: dragging ? 1.06 : 1 }}
      >
        <div
          className="relative rounded-2xl bg-card border-[3px] border-border px-4 py-2 text-center min-w-[90px]"
          style={{ boxShadow: "3px 3px 0px hsl(var(--border))" }}
        >
          <div className="mx-auto mb-0.5 text-primary flex justify-center">{icon}</div>
          <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{currentStop.label}</div>
          <div
            className="absolute left-1/2 -bottom-2 w-3 h-3 bg-card border-r-[3px] border-b-[3px] border-border"
            style={{ transform: "translateX(-50%) rotate(45deg)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

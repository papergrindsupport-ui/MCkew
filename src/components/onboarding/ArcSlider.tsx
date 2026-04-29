import { useRef, useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Flame, Zap, Trophy, Rocket } from "lucide-react";

interface ArcSliderProps {
  value: number;
  onChange: (v: number) => void;
  isBoring: boolean;
}

const STOPS = [
  { val: 5, label: "5", sublabel: "Light", Icon: Target },
  { val: 10, label: "10", sublabel: "Steady", Icon: Flame },
  { val: 20, label: "20", sublabel: "Focused", Icon: Zap },
  { val: 30, label: "30", sublabel: "Intense", Icon: Trophy },
  { val: 50, label: "50", sublabel: "Beast", Icon: Rocket },
];

const CX = 160;
const CY = 170;
const R = 130;
const START_ANGLE = Math.PI;
const END_ANGLE = 0;

function angleForIndex(i: number) {
  return START_ANGLE - (i / (STOPS.length - 1)) * (START_ANGLE - END_ANGLE);
}

function posOnArc(angle: number) {
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

export default function ArcSlider({ value, onChange, isBoring }: ArcSliderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectedIdx = STOPS.findIndex((s) => s.val === value);
  const activeIdx = selectedIdx >= 0 ? selectedIdx : 0;

  const snapToNearest = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = ((clientX - rect.left) / rect.width) * 320;
      const my = ((clientY - rect.top) / rect.height) * 200;

      let closest = 0;
      let minDist = Infinity;
      STOPS.forEach((_, i) => {
        const pos = posOnArc(angleForIndex(i));
        const d = Math.hypot(mx - pos.x, my - pos.y);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      });
      onChange(STOPS[closest].val);
    },
    [onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => snapToNearest(e.clientX, e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, snapToNearest]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      snapToNearest(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => setDragging(false);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragging, snapToNearest]);

  const arcPath = (() => {
    const s = posOnArc(START_ANGLE);
    const e = posOnArc(END_ANGLE);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`;
  })();

  const activeArcPath = (() => {
    const s = posOnArc(START_ANGLE);
    const endAngle = angleForIndex(activeIdx);
    const e = posOnArc(endAngle);
    const sweep = START_ANGLE - endAngle;
    const largeArc = sweep > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  })();

  const thumbPos = posOnArc(angleForIndex(activeIdx));
  const active = STOPS[activeIdx];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="flex flex-col items-center mb-[-20px] z-10"
        key={activeIdx}
        initial={isBoring ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 10 }}
        animate={isBoring ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 400, damping: 20 }}
      >
        <div className="flex flex-col items-center bg-card rounded-2xl px-5 py-3 border-[2.5px] border-border shadow-lg">
          <active.Icon size={32} className="text-primary mb-1" />
          <span className="text-2xl font-bold text-foreground">{active.label}</span>
          <span className="text-xs text-muted-foreground font-medium">{active.sublabel}</span>
        </div>
        <div className="w-3 h-3 bg-card border-b-[2.5px] border-r-[2.5px] border-border transform rotate-45 -mt-[7px]" />
      </motion.div>

      <svg
        ref={svgRef}
        viewBox="0 0 320 200"
        className="w-full max-w-[320px] select-none"
        style={{ touchAction: "none" }}
      >
        <path
          d={arcPath}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <motion.path
          d={activeArcPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={12}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: isBoring ? 0.2 : 0.5 }}
        />

        {STOPS.map((stop, i) => {
          const pos = posOnArc(angleForIndex(i));
          const isActive = i <= activeIdx;
          return (
            <circle
              key={stop.val}
              cx={pos.x}
              cy={pos.y}
              r={i === activeIdx ? 0 : 6}
              fill={isActive ? "hsl(var(--primary))" : "hsl(var(--card))"}
              stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
              strokeWidth={2.5}
              className="cursor-pointer"
              onClick={() => onChange(stop.val)}
            />
          );
        })}

        <circle
          cx={thumbPos.x}
          cy={thumbPos.y}
          r={10}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--card))"
          strokeWidth={4}
          className="cursor-grab"
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
        />

        {STOPS.map((stop, i) => {
          const pos = posOnArc(angleForIndex(i));
          return (
            <g
              key={`label-${stop.val}`}
              onClick={() => onChange(stop.val)}
              className="cursor-pointer"
            >
              <text
                x={pos.x}
                y={pos.y + 24}
                textAnchor="middle"
                className="text-[11px] font-bold fill-foreground"
              >
                {stop.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 36}
                textAnchor="middle"
                className="text-[9px] fill-muted-foreground"
              >
                {stop.sublabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

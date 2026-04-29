import { motion } from "framer-motion";

interface Props {
  value: number;
  goal: number;
  label: string;
  size?: number;
  /** Hex or CSS color for the progress ring. Defaults to primary. */
  color?: string;
  icon?: React.ReactNode;
}

export function RadialProgress({ value, goal, label, size = 140, color, icon }: Props) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const over = value > goal;
  const ringColor = color ?? "hsl(var(--primary))";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="text-primary mb-0.5">{icon}</div>}
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            of {goal}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div
        className={`text-[11px] mt-0.5 text-center ${over ? "text-emerald-500" : "text-muted-foreground"}`}
      >
        {over
          ? `Overachieved by ${value - goal} ${label.toLowerCase()}!`
          : value >= goal
            ? "Goal complete 🎉"
            : `${goal - value} ${label.toLowerCase()} left today`}
      </div>
    </div>
  );
}

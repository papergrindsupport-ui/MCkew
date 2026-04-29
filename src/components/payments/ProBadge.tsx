import { LuSparkles } from "react-icons/lu";
import { useProStore } from "@/stores/useProStore";
import { cn } from "@/lib/utils";

export function ProBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const isPro = useProStore((s) => s.isPro);
  if (!isPro) return null;
  const sizes = size === "md" ? "text-xs px-2.5 py-1 gap-1.5" : "text-[10px] px-2 py-0.5 gap-1";
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold uppercase tracking-wide rounded-full border-[2.5px] border-border bg-gradient-to-r from-primary to-card-yellow text-foreground shadow-sm",
        sizes,
        className,
      )}
      title="Pro account"
    >
      <LuSparkles size={size === "md" ? 14 : 11} />
      Pro
    </span>
  );
}

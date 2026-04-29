import { LuCheck } from "react-icons/lu";
import type React from "react";
import { cn } from "@/lib/utils";

export function SelectionCheckbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  const toggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange();
  };

  return (
    <span
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") toggle(event);
      }}
      className={cn(
        "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-all hover:scale-110 active:scale-95",
        checked
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
          : "border-primary/35 bg-background/85 text-transparent hover:border-primary hover:bg-primary/10",
        className,
      )}
    >
      <LuCheck size={15} strokeWidth={3} />
    </span>
  );
}

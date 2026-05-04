import { Link } from "@tanstack/react-router";
import { LuShieldCheck, LuHeartHandshake, LuCode } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { EnvRoleFlags } from "@/lib/envRoleBadges";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shrink-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EnvRoleBadges({ flags, className }: { flags: EnvRoleFlags; className?: string }) {
  if (!flags.admin && !flags.volunteer && !flags.developer) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {flags.admin && (
        <Pill className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
          <LuShieldCheck size={10} aria-hidden />
          ADMIN
        </Pill>
      )}
      {flags.volunteer && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 cursor-help"
            >
              <LuHeartHandshake size={10} aria-hidden />
              VOLUNTEER
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 z-[10060]" align="start" side="bottom">
            <p className="text-sm font-semibold text-foreground">You can volunteer too!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Help shape MCkew and support other learners.
            </p>
            <Link
              to="/volunteer"
              className="mt-3 inline-flex text-sm font-bold text-primary hover:underline"
            >
              Learn more →
            </Link>
          </PopoverContent>
        </Popover>
      )}
      {flags.developer && (
        <Pill className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25">
          <LuCode size={10} aria-hidden />
          DEV
        </Pill>
      )}
    </span>
  );
}

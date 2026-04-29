import { useMemo } from "react";
import {
  usePlannerState,
  toggleCell,
  cellId,
  variantsForSession,
  SESSION_LABEL,
  type Subject,
  type SessionKey,
  type Variant,
} from "@/lib/plannerStore";
import { LuCheck } from "react-icons/lu";
import { cn } from "@/lib/utils";

function GridCell({
  subject,
  year,
  session,
  variant,
  checked,
  disabled,
}: {
  subject: Subject;
  year: number;
  session: SessionKey;
  variant: Variant;
  checked: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <td className="border border-border bg-muted/30 p-0">
        <div className="h-10 w-full grid place-items-center text-muted-foreground/40 text-xs">
          —
        </div>
      </td>
    );
  }
  return (
    <td className="border border-border p-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${year} ${SESSION_LABEL[session]} ${variant}`}
        onClick={() => toggleCell(subject, year, session, variant)}
        className={cn(
          "group h-10 w-full grid place-items-center transition-colors cursor-pointer",
          checked
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card hover:bg-primary/10",
        )}
      >
        <LuCheck
          size={18}
          strokeWidth={3}
          className={cn(
            "transition-opacity",
            checked ? "opacity-100" : "opacity-0 group-hover:opacity-30",
          )}
        />
      </button>
    </td>
  );
}

export function PlannerTable({ subject }: { subject: Subject }) {
  const state = usePlannerState(subject);
  const { settings, checked } = state;
  const { years, sessions, variants, layout } = settings;

  const sessionVariants = useMemo(
    () =>
      sessions
        .map((s) => ({ session: s, variants: variantsForSession(s, variants) }))
        .filter((sv) => sv.variants.length > 0),
    [sessions, variants],
  );

  if (years.length === 0 || sessionVariants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Nothing to show. Open Settings to enable years, sessions, or variants.
      </div>
    );
  }

  const cell = (year: number, session: SessionKey, variant: Variant, disabled = false) => (
    <GridCell
      subject={subject}
      year={year}
      session={session}
      variant={variant}
      checked={!!checked[cellId(year, session, variant)]}
      disabled={disabled}
    />
  );

  const tableCls = "w-full text-sm border-collapse border border-border";
  const thCls = "border border-border bg-muted/60 px-3 py-2 font-bold text-foreground";
  const stickyThCls = cn(thCls, "sticky left-0 z-10 text-left");

  if (layout === "years-cols_sessions-rows_variants-subrows") {
    return (
      <div className="rounded-2xl border-2 border-border bg-card overflow-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={cn(stickyThCls, "text-left")}>Session</th>
              <th className={cn(thCls, "text-left")}>Variant</th>
              {years.map((y) => (
                <th key={y} className={cn(thCls, "text-center")}>
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessionVariants.map(({ session, variants: vs }) =>
              vs.map((v, i) => (
                <tr key={`${session}-${v}`}>
                  {i === 0 && (
                    <th rowSpan={vs.length} className={cn(stickyThCls, "align-middle")}>
                      {SESSION_LABEL[session]}
                    </th>
                  )}
                  <td className="border border-border bg-muted/20 px-3 py-2 text-muted-foreground font-medium">
                    {v}
                  </td>
                  {years.map((y) => cell(y, session, v))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (layout === "years-cols_sessions-rows_variants-subcols") {
    return (
      <div className="rounded-2xl border-2 border-border bg-card overflow-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th rowSpan={2} className={stickyThCls}>
                Session
              </th>
              {years.map((y) => (
                <th key={y} colSpan={variants.length} className={cn(thCls, "text-center")}>
                  {y}
                </th>
              ))}
            </tr>
            <tr>
              {years.map((y) =>
                variants.map((v) => (
                  <th
                    key={`${y}-${v}`}
                    className="border border-border bg-muted/40 px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                  >
                    {v}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {sessionVariants.map(({ session, variants: vs }) => (
              <tr key={session}>
                <th className={stickyThCls}>{SESSION_LABEL[session]}</th>
                {years.map((y) => variants.map((v) => cell(y, session, v, !vs.includes(v))))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (layout === "years-rows_sessions-cols_variants-subcols") {
    return (
      <div className="rounded-2xl border-2 border-border bg-card overflow-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th rowSpan={2} className={stickyThCls}>
                Year
              </th>
              {sessionVariants.map(({ session, variants: vs }) => (
                <th key={session} colSpan={vs.length} className={cn(thCls, "text-center")}>
                  {SESSION_LABEL[session]}
                </th>
              ))}
            </tr>
            <tr>
              {sessionVariants.map(({ session, variants: vs }) =>
                vs.map((v) => (
                  <th
                    key={`${session}-${v}`}
                    className="border border-border bg-muted/40 px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                  >
                    {v}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y}>
                <th className={stickyThCls}>{y}</th>
                {sessionVariants.map(({ session, variants: vs }) =>
                  vs.map((v) => cell(y, session, v)),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // years-rows_sessions-cols_variants-subrows
  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-auto">
      <table className={tableCls}>
        <thead>
          <tr>
            <th className={cn(stickyThCls, "text-left")}>Year</th>
            <th className={cn(thCls, "text-left")}>Variant</th>
            {sessionVariants.map(({ session }) => (
              <th key={session} className={cn(thCls, "text-center")}>
                {SESSION_LABEL[session]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((y) =>
            variants.map((v, i) => (
              <tr key={`${y}-${v}`}>
                {i === 0 && (
                  <th rowSpan={variants.length} className={cn(stickyThCls, "align-middle")}>
                    {y}
                  </th>
                )}
                <td className="border border-border bg-muted/20 px-3 py-2 text-muted-foreground font-medium">
                  {v}
                </td>
                {sessionVariants.map(({ session, variants: vs }) =>
                  cell(y, session, v, !vs.includes(v)),
                )}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

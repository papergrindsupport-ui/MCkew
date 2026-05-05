// Editor for a Paper: identity (subject/year/session/variant), title, links,
// tags + topic/skill chips (auto-derived view), and the grade thresholds builder
// (9–1 number table and A–G letter table, side by side).

import { useState } from "react";
import type { Paper, Subject, SessionKey, Variant } from "@/data/paperData";
import { SUBJECTS, YEARS, SESSIONS, SESSION_VARIANTS } from "@/data/paperData";
import { ALL_TAGS } from "@/data/topics";
import {
  LETTER_ORDER,
  NUMBER_ORDER,
  type LetterGrade,
  type NumberGrade,
  type PaperThresholds,
} from "@/data/gradeThresholds";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/admin/ui/Dropdown";
import { cn } from "@/lib/utils";

interface Props {
  paper: Partial<Paper> & { id?: string };
  onChange: (next: Partial<Paper> & { id: string }) => void;
  thresholds: PaperThresholds;
  onThresholdsChange: (t: PaperThresholds) => void;
  isNew: boolean;
}

export function PaperForm({ paper, onChange, thresholds, onThresholdsChange, isNew }: Props) {
  const subject = (paper.subject ?? "bio") as Subject;
  const year = paper.year ?? YEARS[YEARS.length - 1];
  const session = (paper.session ?? "June") as SessionKey;
  const variant = (paper.variant ?? SESSION_VARIANTS[session][0]) as Variant;

  function updateIdentity(next: {
    subject: Subject;
    year: number;
    session: SessionKey;
    variant: Variant;
  }) {
    const id = `${next.subject}-${next.year}-${next.session}-${next.variant}`;
    onChange({
      ...paper,
      ...next,
      id,
      title: paper.title || `${next.year} ${next.session} ${next.variant}`,
    });
  }

  function set<K extends keyof Paper>(key: K, val: Paper[K]) {
    onChange({ ...paper, id: paper.id ?? `${subject}-${year}-${session}-${variant}`, [key]: val });
  }

  const tagsSet = new Set(paper.tags ?? []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="Subject">
          <Dropdown<string>
            disabled={!isNew}
            value={subject}
            onChange={(v) => updateIdentity({ subject: v as Subject, year, session, variant })}
            options={SUBJECTS.map((s) => ({ value: s.key, label: s.label }))}
          />
        </Field>
        <Field label="Year">
          <Dropdown<number>
            disabled={!isNew}
            value={year}
            onChange={(v) => updateIdentity({ subject, year: v, session, variant })}
            options={YEARS.map((y) => ({ value: y, label: String(y) }))}
          />
        </Field>
        <Field label="Session">
          <Dropdown<string>
            disabled={!isNew}
            value={session}
            onChange={(v) => {
              const newSess = v as SessionKey;
              const newVar = SESSION_VARIANTS[newSess].includes(variant)
                ? variant
                : SESSION_VARIANTS[newSess][0];
              updateIdentity({ subject, year, session: newSess, variant: newVar });
            }}
            options={SESSIONS.map((s) => ({ value: s.key, label: s.label }))}
          />
        </Field>
        <Field label="Variant">
          <Dropdown<string>
            disabled={!isNew}
            value={variant}
            onChange={(v) => updateIdentity({ subject, year, session, variant: v as Variant })}
            options={SESSION_VARIANTS[session].map((v) => ({ value: v, label: v }))}
          />
        </Field>
      </div>

      <Field label="Title">
        <Input
          value={paper.title ?? ""}
          onChange={(e) => set("title", e.target.value)}
          placeholder="2024 June V2"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Field label="Question paper link">
          <Input
            value={paper.qpLink ?? ""}
            onChange={(e) => set("qpLink", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="Markscheme link">
          <Input
            value={paper.msLink ?? ""}
            onChange={(e) => set("msLink", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="Grade thresholds link">
          <Input
            value={paper.gtLink ?? ""}
            onChange={(e) => set("gtLink", e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>

      {/* Tag chips */}
      <Field label="Tags">
        <div className="flex flex-wrap gap-1">
          {ALL_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => {
                const next = new Set(tagsSet);
                if (next.has(t)) next.delete(t);
                else next.add(t);
                set("tags", Array.from(next));
              }}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs border transition-colors",
                tagsSet.has(t)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <ThresholdsBuilder value={thresholds} onChange={onThresholdsChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

/* ─────────────── Grade Thresholds Builder ─────────────── */

function ThresholdsBuilder({
  value,
  onChange,
}: {
  value: PaperThresholds;
  onChange: (t: PaperThresholds) => void;
}) {
  const [hasNumber, setHasNumber] = useState(!!value.number);
  const [hasLetter, setHasLetter] = useState(!!value.letter);
  const ADMIN_NUMBER_ORDER = NUMBER_ORDER.slice(1) as NumberGrade[];
  const ADMIN_LETTER_ORDER = LETTER_ORDER.filter((g) => g !== "A*") as LetterGrade[];

  function setNumberCell(g: NumberGrade, mark: number) {
    const cur =
      value.number ??
      (Object.fromEntries(NUMBER_ORDER.map((x) => [x, 0])) as Record<NumberGrade, number>);
    onChange({ ...value, number: { ...cur, [g]: mark } });
  }
  function setLetterCell(g: LetterGrade, mark: number) {
    const cur =
      value.letter ??
      (Object.fromEntries(LETTER_ORDER.map((x) => [x, 0])) as Record<LetterGrade, number>);
    onChange({ ...value, letter: { ...cur, [g]: mark } });
  }

  return (
    <div className="rounded-lg border border-border p-3 bg-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold">Grade thresholds (out of 40)</h3>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={hasNumber}
              onChange={(e) => {
                setHasNumber(e.target.checked);
                if (!e.target.checked) onChange({ ...value, number: undefined });
                else
                  onChange({
                    ...value,
                    number:
                      value.number ??
                      (Object.fromEntries(NUMBER_ORDER.map((g) => [g, 0])) as Record<
                        NumberGrade,
                        number
                      >),
                  });
              }}
            />
            8–1 format
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={hasLetter}
              onChange={(e) => {
                setHasLetter(e.target.checked);
                if (!e.target.checked) onChange({ ...value, letter: undefined });
                else
                  onChange({
                    ...value,
                    letter:
                      value.letter ??
                      (Object.fromEntries(LETTER_ORDER.map((g) => [g, 0])) as Record<
                        LetterGrade,
                        number
                      >),
                  });
              }}
            />
            A–G format
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hasNumber && (
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">8–1</h4>
            <div className="grid grid-cols-2 gap-1">
              {ADMIN_NUMBER_ORDER.map((g) => (
                <ThresholdInput
                  key={g}
                  label={g}
                  value={value.number?.[g] ?? 0}
                  onChange={(v) => setNumberCell(g, v)}
                />
              ))}
            </div>
          </div>
        )}
        {hasLetter && (
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">A–G</h4>
            <div className="grid grid-cols-2 gap-1">
              {ADMIN_LETTER_ORDER.map((g) => (
                <ThresholdInput
                  key={g}
                  label={g}
                  value={value.letter?.[g] ?? 0}
                  onChange={(v) => setLetterCell(g, v)}
                />
              ))}
            </div>
          </div>
        )}
        {!hasNumber && !hasLetter && (
          <p className="text-xs text-muted-foreground col-span-2">
            Enable at least one format above to define thresholds.
          </p>
        )}
        {(hasNumber || hasLetter) && (
          <div className="text-xs text-muted-foreground col-span-2">
            Enter paper-2 thresholds only for A–G and 8–1. A* and 9 do not apply to individual
            components.
          </div>
        )}
      </div>
    </div>
  );
}

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-7 text-right font-mono font-bold">{label}:</span>
      <input
        type="number"
        min={0}
        max={40}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
        className="w-16 h-7 rounded border border-input bg-background px-1.5 text-xs text-right"
      />
    </label>
  );
}

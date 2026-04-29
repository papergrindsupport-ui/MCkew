// Universities picker — "Add" button opens a modal with:
//   • full local dataset (public/data/universities.json), loaded lazily
//   • country filter that applies to the displayed list
//   • text search filtering the local dataset
// No external API calls.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Globe, Loader2, ExternalLink, Check } from "lucide-react";
import { countries } from "country-codes-flags-phone-codes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UniversityRef } from "@/data/profileTypes";
import {
  loadUniversities,
  getUniversitiesSync,
  type SeedUniversity,
} from "@/data/universitiesSeed";

interface Props {
  value: UniversityRef[];
  onChange: (next: UniversityRef[]) => void;
}

function flagFor(code?: string) {
  if (!code) return null;
  return countries.find((c) => c.code === code.toUpperCase())?.flag ?? null;
}

function toRef(u: SeedUniversity): UniversityRef {
  return {
    name: u.name,
    country: u.country,
    countryCode: u.alpha_two_code,
    domain: u.domains?.[0],
    webPage: u.web_pages?.[0],
  };
}

export default function UniversityPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function remove(name: string) {
    onChange(value.filter((v) => v.name !== name));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          <AnimatePresence initial={false}>
            {value.map((u) => (
              <motion.div
                key={u.name}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="relative p-3 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => remove(u.name)}
                  className="absolute top-2 right-2 h-6 w-6 inline-flex items-center justify-center rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                <div className="flex items-start gap-2 pr-6">
                  <span className="text-xl leading-none">
                    {flagFor(u.countryCode) ?? <Globe size={16} />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.country}</div>
                    {u.webPage && (
                      <a
                        href={u.webPage}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Visit <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-colors"
      >
        <Plus size={14} /> Add university
      </motion.button>

      <AddUniversityModal
        open={open}
        onOpenChange={setOpen}
        selected={value}
        onAdd={(u) => {
          if (value.some((v) => v.name === u.name)) return;
          onChange([...value, toRef(u)]);
        }}
        onRemove={remove}
      />
    </div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */

function AddUniversityModal({
  open,
  onOpenChange,
  selected,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: UniversityRef[];
  onAdd: (u: SeedUniversity) => void;
  onRemove: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("");
  const [data, setData] = useState<SeedUniversity[] | null>(getUniversitiesSync());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadUniversities()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error).message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countrySearch]);

  // Only show countries that actually exist in the dataset
  const availableCountryCodes = useMemo(() => {
    if (!data) return null;
    const s = new Set<string>();
    for (const u of data) if (u.alpha_two_code) s.add(u.alpha_two_code);
    return s;
  }, [data]);

  const displayed: SeedUniversity[] = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const out: SeedUniversity[] = [];
    const limit = 100;
    for (const u of data) {
      if (country && u.alpha_two_code !== country) continue;
      if (q && !u.name.toLowerCase().includes(q)) continue;
      out.push(u);
      if (out.length >= limit) break;
    }
    return out;
  }, [data, search, country]);

  const totalMatches = useMemo(() => {
    if (!data) return 0;
    const q = search.trim().toLowerCase();
    if (!q && !country) return data.length;
    let n = 0;
    for (const u of data) {
      if (country && u.alpha_two_code !== country) continue;
      if (q && !u.name.toLowerCase().includes(q)) continue;
      n++;
    }
    return n;
  }, [data, search, country]);

  const currentCountry = countries.find((c) => c.code === country);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-lg font-extrabold">Add a target university</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Browse the list, or search by name. Filter by country to narrow it down.
          </p>
        </DialogHeader>

        <div className="px-5 pt-4 flex flex-col sm:flex-row gap-2">
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border-2 border-border bg-card text-sm hover:border-primary/50 transition-colors"
              >
                {currentCountry ? (
                  <>
                    <span className="text-base leading-none">{currentCountry.flag}</span>
                    <span className="font-medium truncate max-w-32">{currentCountry.name}</span>
                  </>
                ) : (
                  <>
                    <Globe size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Any country</span>
                  </>
                )}
                {country && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCountry("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setCountry("");
                      }
                    }}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                    aria-label="Clear country"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 z-[100]" align="start">
              <div className="relative mb-2">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-0.5 pr-2">
                  {filteredCountries.map((c) => {
                    const disabled = availableCountryCodes
                      ? !availableCountryCodes.has(c.code)
                      : false;
                    return (
                      <motion.button
                        key={c.code}
                        type="button"
                        whileHover={disabled ? {} : { x: 2 }}
                        disabled={disabled}
                        onClick={() => {
                          setCountry(c.code);
                          setCountryOpen(false);
                          setCountrySearch("");
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                          country === c.code
                            ? "bg-primary/10 text-primary font-semibold"
                            : disabled
                              ? "text-muted-foreground/50 cursor-not-allowed"
                              : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1 truncate">{c.name}</span>
                      </motion.button>
                    );
                  })}
                  {filteredCountries.length === 0 && (
                    <div className="px-2.5 py-2 text-xs text-muted-foreground italic">
                      No countries match.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search universities..."
              className="pl-9 h-10"
            />
            {loading && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
              />
            )}
          </div>
        </div>

        <div className="px-5 pt-2 text-xs text-muted-foreground">
          {loading && !data ? (
            <>Loading universities…</>
          ) : loadError ? (
            <span className="text-destructive">Couldn't load universities: {loadError}</span>
          ) : (
            <>
              Showing {displayed.length} of {totalMatches.toLocaleString()} match
              {totalMatches === 1 ? "" : "es"}
              {country ? ` in ${currentCountry?.name}` : ""}
              {search.trim() ? ` for “${search.trim()}”` : ""}.
            </>
          )}
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
            <ScrollArea className="h-80">
              <div className="divide-y divide-border">
                {displayed.map((u, i) => {
                  const already = selected.some((v) => v.name === u.name);
                  return (
                    <div
                      key={`${u.name}-${u.country}-${i}`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="text-xl leading-none">
                        {flagFor(u.alpha_two_code) ?? <Globe size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {u.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.country}</div>
                      </div>
                      {already ? (
                        <button
                          type="button"
                          onClick={() => onRemove(u.name)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Check size={12} /> Added
                        </button>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => onAdd(u)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                        >
                          <Plus size={12} /> Add
                        </motion.button>
                      )}
                    </div>
                  );
                })}
                {!loading && data && displayed.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground italic">
                    No universities found{country ? ` in ${currentCountry?.name}` : ""}.
                  </div>
                )}
                {loading && !data && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground italic flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { countries } from "country-codes-flags-phone-codes";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { PhoneContact, PhoneSubtype } from "./volunteer-types";

const PHONE_TYPES: { value: PhoneSubtype; label: string; emoji: string }[] = [
  { value: "mobile", label: "Mobile (Line)", emoji: "📱" },
  { value: "whatsapp", label: "WhatsApp", emoji: "💚" },
  { value: "other", label: "Other", emoji: "✨" },
];

interface Props {
  value: PhoneContact;
  onChange: (v: PhoneContact) => void;
}

export default function PhoneInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      search
        ? countries.filter(
            (c) =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.dialCode.includes(search) ||
              c.code.toLowerCase().includes(search.toLowerCase()),
          )
        : countries,
    [search],
  );

  const current = countries.find((c) => c.code === (value.countryCode || "US"));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 h-11 rounded-xl border-2 border-border bg-card hover:bg-muted/50 transition-colors min-w-[110px]"
            >
              <span className="text-xl leading-none">{current?.flag || "🌐"}</span>
              <span className="text-sm font-semibold text-foreground">
                {value.dialCode || "+1"}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search country or +code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-0.5 pr-2">
                {filtered.map((c) => (
                  <motion.button
                    key={c.code}
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      onChange({ ...value, countryCode: c.code, dialCode: c.dialCode });
                      setOpen(false);
                      setSearch("");
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left ${
                      value.countryCode === c.code
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{c.dialCode}</span>
                  </motion.button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No country found
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          placeholder="Phone number"
          value={value.number}
          onChange={(e) => onChange({ ...value, number: e.target.value.replace(/[^\d\s-]/g, "") })}
          className="flex-1 h-11 px-4 rounded-xl border-2 border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PHONE_TYPES.map((t) => {
          const active = value.subtype === t.value;
          return (
            <motion.button
              key={t.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange({ ...value, subtype: t.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all flex items-center gap-1 ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {value.subtype === "other" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              placeholder="Specify (e.g. Signal, Viber)..."
              value={value.customSubtype || ""}
              onChange={(e) => onChange({ ...value, customSubtype: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

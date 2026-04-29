import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Mail, Phone, Hash, MoreHorizontal, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PhoneInput from "./PhoneInput";
import SocialInput from "./SocialInput";
import type { ContactMethod } from "./volunteer-types";

interface Props {
  methods: ContactMethod[];
  onChange: (methods: ContactMethod[]) => void;
}

const TYPES = [
  { kind: "phone", label: "Phone", icon: Phone },
  { kind: "email", label: "Email", icon: Mail },
  { kind: "social", label: "Social", icon: Hash },
  { kind: "other", label: "Other", icon: MoreHorizontal },
] as const;

function newMethod(kind: ContactMethod["kind"]): ContactMethod {
  switch (kind) {
    case "phone":
      return { kind: "phone", countryCode: "US", dialCode: "+1", number: "", subtype: "mobile" };
    case "email":
      return { kind: "email", email: "" };
    case "social":
      return { kind: "social", platform: "instagram", username: "" };
    case "other":
      return { kind: "other", label: "", value: "", link: "" };
  }
}

export default function ContactMethodsManager({ methods, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (idx: number, m: ContactMethod) => {
    const next = [...methods];
    next[idx] = m;
    onChange(next);
  };
  const remove = (idx: number) => {
    onChange(methods.filter((_, i) => i !== idx));
  };
  const add = (kind: ContactMethod["kind"]) => {
    onChange([...methods, newMethod(kind)]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {methods.map((m, idx) => (
          <motion.div
            key={idx}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative p-4 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-muted/20 group"
          >
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background border-2 border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-all opacity-0 group-hover:opacity-100"
              aria-label="Remove"
            >
              <X size={13} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              {m.kind === "phone" && <Phone size={14} className="text-primary" />}
              {m.kind === "email" && <Mail size={14} className="text-primary" />}
              {m.kind === "social" && <Hash size={14} className="text-primary" />}
              {m.kind === "other" && <MoreHorizontal size={14} className="text-primary" />}
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {m.kind === "phone"
                  ? "Phone"
                  : m.kind === "email"
                    ? "Email"
                    : m.kind === "social"
                      ? "Social"
                      : "Other"}
              </span>
            </div>

            {m.kind === "phone" && <PhoneInput value={m} onChange={(v) => update(idx, v)} />}

            {m.kind === "email" && (
              <input
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={m.email}
                onChange={(e) => update(idx, { ...m, email: e.target.value.trim() })}
                className="w-full h-11 px-4 rounded-xl border-2 border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors"
              />
            )}

            {m.kind === "social" && <SocialInput value={m} onChange={(v) => update(idx, v)} />}

            {m.kind === "other" && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Method name (e.g. Carrier pigeon)"
                  value={m.label}
                  onChange={(e) => update(idx, { ...m, label: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-2 border-border bg-card text-sm font-medium focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Contact details"
                  value={m.value}
                  onChange={(e) => update(idx, { ...m, value: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                />
                <div className="flex items-center gap-2">
                  <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                  <input
                    type="url"
                    placeholder="Link (optional)"
                    value={m.link || ""}
                    onChange={(e) => update(idx, { ...m, link: e.target.value })}
                    className="flex-1 h-9 px-3 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary hover:bg-primary/5 hover:text-primary text-muted-foreground font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add contact method
          </motion.button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5" align="center">
          <div className="space-y-0.5">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.kind}
                  type="button"
                  whileHover={{ x: 3 }}
                  onClick={() => add(t.kind)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                >
                  <Icon size={15} />
                  {t.label}
                </motion.button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {methods.length === 0 && (
        <p className="text-center text-xs text-muted-foreground italic">
          Add at least one way for us to reach you
        </p>
      )}
    </div>
  );
}

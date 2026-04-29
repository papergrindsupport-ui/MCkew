import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { countries } from "country-codes-flags-phone-codes";
import { Search, ChevronDown, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export default function CountrySelector({
  value,
  onChange,
  placeholder = "Select country",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search
        ? countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : countries,
    [search],
  );

  const current = countries.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-2.5 h-11 px-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-colors text-left"
        >
          {current ? (
            <>
              <span className="text-xl leading-none">{current.flag}</span>
              <span className="flex-1 text-sm font-medium text-foreground truncate">
                {current.name}
              </span>
            </>
          ) : (
            <>
              <Lock size={14} className="text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
            </>
          )}
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search..."
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
                  onChange(c.code);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                  value === c.code
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
              </motion.button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

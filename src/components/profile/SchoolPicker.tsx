// School dropdown with seed list + custom-add via "Other" option.

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, Plus, Check, School } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { addCustomSchool, useAllSchools } from "@/lib/profileStore";
import toast from "react-hot-toast";

interface Props {
  value?: string;
  onChange: (v: string) => void;
}

export default function SchoolPicker({ value, onChange }: Props) {
  const schools = useAllSchools();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otherMode, setOtherMode] = useState(false);
  const [otherName, setOtherName] = useState("");

  const filtered = useMemo(
    () =>
      search ? schools.filter((s) => s.toLowerCase().includes(search.toLowerCase())) : schools,
    [schools, search],
  );

  function addAndPick() {
    const name = otherName.trim();
    if (!name) return;
    addCustomSchool(name);
    onChange(name);
    setOtherMode(false);
    setOtherName("");
    setSearch("");
    setOpen(false);
    toast.success(`Added ${name}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-2.5 h-11 px-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-colors text-left"
        >
          <School size={16} className="text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground truncate">
            {value || "Choose your school"}
          </span>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        {!otherMode ? (
          <>
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-0.5 pr-2">
                {filtered.map((s) => (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      onChange(s);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      value === s
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex-1 truncate">{s}</span>
                    {value === s && <Check size={14} />}
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  whileHover={{ x: 2 }}
                  onClick={() => setOtherMode(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left text-primary font-semibold hover:bg-primary/10"
                >
                  <Plus size={14} /> Other (add yours)
                </motion.button>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Type your school name"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addAndPick()}
              className="h-9 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addAndPick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
              >
                <Plus size={14} /> Add to list
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtherMode(false);
                  setOtherName("");
                }}
                className="h-9 px-3 rounded-lg border-2 border-border bg-card text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

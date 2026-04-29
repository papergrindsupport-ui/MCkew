// Animated chip selector for exam sessions. Click to add/remove.

import { motion, AnimatePresence } from "framer-motion";
import { Check, CalendarDays } from "lucide-react";
import { EXAM_SESSIONS, type ExamSession } from "@/data/profileTypes";

interface Props {
  value: ExamSession[];
  onChange: (next: ExamSession[]) => void;
}

export default function ExamSessionPicker({ value, onChange }: Props) {
  function toggle(id: ExamSession) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {EXAM_SESSIONS.map((s) => {
        const on = value.includes(s.id);
        return (
          <motion.button
            key={s.id}
            type="button"
            whileTap={{ scale: 0.93 }}
            whileHover={{ y: -2 }}
            onClick={() => toggle(s.id)}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            <CalendarDays size={12} />
            {s.label}
            <AnimatePresence>
              {on && (
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="inline-flex"
                >
                  <Check size={12} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

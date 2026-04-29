// Compact reusable visibility toggle (eye / eye-off) for any field.

import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  visible: boolean;
  onToggle: () => void;
  label?: string;
}

export default function VisibilityToggle({ visible, onToggle, label }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onToggle}
      aria-label={label ? `${label} visibility` : "Visibility"}
      title={visible ? "Visible on public profile" : "Hidden from public profile"}
      className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border-2 transition-colors ${
        visible
          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={visible ? "on" : "off"}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          {visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </motion.span>
      </AnimatePresence>
      {visible ? "Public" : "Hidden"}
    </motion.button>
  );
}

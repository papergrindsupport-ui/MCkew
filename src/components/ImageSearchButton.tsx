// Small icon-button that opens a hidden file picker, runs OCR on the chosen
// image, and calls onText() with the extracted string. Used inside search bars.

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { LuImage, LuLoader } from "react-icons/lu";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ocrImage } from "@/lib/imageOcr";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ImageSearchButton({
  onText,
  className,
  size = 12,
}: {
  onText: (text: string) => void;
  className?: string;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await ocrImage(file);
      if (!text.trim()) {
        toast.error("No text detected in that image.");
        return;
      }
      onText(text);
    } catch (err) {
      console.error("OCR failed", err);
      toast.error("OCR failed — try a clearer image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            aria-label="Search by image"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-background hover:border-primary/60 cursor-pointer shrink-0 disabled:opacity-60",
              className,
            )}
          >
            {busy ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="inline-flex"
              >
                <LuLoader size={size} />
              </motion.span>
            ) : (
              <LuImage size={size} />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Search by image (OCR)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

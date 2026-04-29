// Site-wide drag-and-drop image overlay.
//
// Listens at the window level for `dragenter` events carrying an image. When
// detected, shows a large full-screen "Drop image to search!" zone. On drop,
// runs OCR and navigates to /search with the extracted text + lenient mode.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuImage, LuLoader, LuScanText } from "react-icons/lu";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { ocrImage } from "@/lib/imageOcr";

function dragHasImage(e: DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  // items[].kind === "file" + type starts with image/
  if (dt.items && dt.items.length > 0) {
    for (const it of Array.from(dt.items)) {
      if (it.kind === "file" && (!it.type || it.type.startsWith("image/"))) {
        return true;
      }
    }
    return false;
  }
  // Fallback: types may include "Files" (Safari)
  return Array.from(dt.types || []).includes("Files");
}

function firstImageFile(e: DragEvent): File | null {
  const files = e.dataTransfer?.files;
  if (!files) return null;
  for (const f of Array.from(files)) {
    if (f.type.startsWith("image/")) return f;
  }
  return null;
}

export function ImageSearchDropOverlay() {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragDepth = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!dragHasImage(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setActive(true);
    };
    const onOver = (e: DragEvent) => {
      if (!dragHasImage(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!dragHasImage(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setActive(false);
    };
    const onDrop = async (e: DragEvent) => {
      if (!dragHasImage(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      const file = firstImageFile(e);
      if (!file) {
        setActive(false);
        return;
      }
      setBusy(true);
      try {
        const text = await ocrImage(file);
        if (!text.trim()) {
          toast.error("Couldn't read any text from that image.");
        } else {
          toast.success("Searching by image…");
          navigate({ to: "/search", search: { q: text, mode: "lenient" } });
        }
      } catch (err) {
        console.error("OCR failed", err);
        toast.error("OCR failed — try a clearer image.");
      } finally {
        setBusy(false);
        setActive(false);
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [navigate]);

  return (
    <AnimatePresence>
      {(active || busy) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none"
          style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-3xl aspect-[16/9] rounded-3xl border-4 border-dashed border-primary/70 bg-card/70 flex flex-col items-center justify-center gap-4 text-center px-8"
          >
            {busy ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="text-primary"
                >
                  <LuLoader size={56} />
                </motion.div>
                <h2 className="text-2xl font-bold">Reading text from your image…</h2>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds the first time.
                </p>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="text-primary"
                >
                  <LuImage size={64} />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-bold">Drop in image to search!</h2>
                <p className="text-sm md:text-base text-muted-foreground inline-flex items-center gap-2">
                  <LuScanText size={16} /> We'll read the text and search for it.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

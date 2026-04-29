// Global floating toolbar shown when the user selects text inside an
// AnnotatableBlock. Mounted once at the app root.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuHighlighter,
  LuUnderline,
  LuCopy,
  LuTag,
  LuMessageSquare,
  LuEyeOff,
} from "react-icons/lu";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useSelectionAnnotationsStore } from "./useSelectionAnnotationsStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ActiveSelection {
  blockKey: string;
  start: number;
  end: number;
  text: string;
  rect: DOMRect;
}

/**
 * Compute char offset of a (node, offset) pair within the block element.
 * Walks text-node descendants in document order, summing their lengths until
 * reaching the target node.
 */
function offsetWithinBlock(block: HTMLElement, node: Node, offset: number): number | null {
  let total = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) return total + offset;
    // Skip text inside descendant blocks (shouldn't happen — blocks aren't nested).
    if (cur.nodeType === Node.TEXT_NODE) {
      // Skip text inside circle indicators / non-content spans
      const parent = (cur as Text).parentElement;
      const skip = parent && parent.closest("[data-anno-skip]");
      if (!skip) total += (cur as Text).data.length;
    }
    cur = walker.nextNode();
  }
  return null;
}

function findBlockEl(node: Node | null): HTMLElement | null {
  let n: Node | null = node;
  while (n) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.dataset && el.dataset.annotationBlock) return el;
    }
    n = n.parentNode;
  }
  return null;
}

export function SelectionPopover() {
  const enabled = useAppSettingsStore((s) => s.showTextPopover);
  const [active, setActive] = useState<ActiveSelection | null>(null);
  const ignoreRef = useRef(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const toggleStyle = useSelectionAnnotationsStore((s) => s.toggleStyle);
  const addAnn = useSelectionAnnotationsStore((s) => s.add);
  const annsForBlock = useSelectionAnnotationsStore((s) =>
    active ? s.byBlock[active.blockKey] : undefined,
  );

  // Detect existing style annotations on this exact range (for toggle UI state).
  const existing = useMemo(() => {
    if (!active || !annsForBlock) return { highlight: false, underline: false, blur: false };
    const match = (t: "highlight" | "underline" | "blur") =>
      annsForBlock.some((a) => a.type === t && a.start === active.start && a.end === active.end);
    return {
      highlight: match("highlight"),
      underline: match("underline"),
      blur: match("blur"),
    };
  }, [active, annsForBlock]);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const handler = () => {
      if (ignoreRef.current) return;
      // Defer to allow DOM to settle.
      window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setActive(null);
          return;
        }
        // Don't trigger when selection is inside the toolbar / a popover / input.
        const range = sel.getRangeAt(0);
        const anchorEl =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;
        if (!anchorEl) return;
        if (anchorEl.closest("[data-anno-toolbar]")) return;
        if (anchorEl.closest("input, textarea, [contenteditable='true']")) {
          setActive(null);
          return;
        }

        const blockA = findBlockEl(range.startContainer);
        const blockB = findBlockEl(range.endContainer);
        if (!blockA || blockA !== blockB) {
          // Cross-block / outside annotated text — don't show toolbar.
          setActive(null);
          return;
        }
        const start = offsetWithinBlock(blockA, range.startContainer, range.startOffset);
        const end = offsetWithinBlock(blockA, range.endContainer, range.endOffset);
        if (start == null || end == null || start === end) {
          setActive(null);
          return;
        }
        const [s, e] = start <= end ? [start, end] : [end, start];
        const text = (blockA.dataset.annotationText ?? "").slice(s, e);
        if (!text.trim()) {
          setActive(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setActive({
          blockKey: blockA.dataset.annotationBlock!,
          start: s,
          end: e,
          text,
          rect,
        });
      }, 10);
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [enabled]);

  // Hide on outside click / scroll resize.
  useEffect(() => {
    if (!active) return;
    const onScroll = () => setActive(null);
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("[data-anno-toolbar]")) return;
      // Let selectionchange handle re-detection.
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [active]);

  if (!enabled || !active) return null;

  // Position at the selection top; the framer-motion animation translates
  // upward by the selection height so the toolbar lands above it.
  const top = active.rect.top + window.scrollY;
  const left = active.rect.left + window.scrollX + active.rect.width / 2;

  const clear = () => {
    ignoreRef.current = true;
    window.getSelection()?.removeAllRanges();
    setActive(null);
    setTimeout(() => {
      ignoreRef.current = false;
    }, 50);
  };

  const onHighlight = () => {
    toggleStyle(active.blockKey, active.start, active.end, active.text, "highlight");
    clear();
  };
  const onUnderline = () => {
    toggleStyle(active.blockKey, active.start, active.end, active.text, "underline");
    clear();
  };
  const onBlur = () => {
    toggleStyle(active.blockKey, active.start, active.end, active.text, "blur");
    clear();
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(active.text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    clear();
  };
  const onTag = () => {
    addAnn({
      blockKey: active.blockKey,
      start: active.start,
      end: active.end,
      text: active.text,
      type: "tags",
      tagIds: [],
    });
    clear();
    toast("Tag added — click the circle to choose tags");
  };
  const onComment = () => {
    addAnn({
      blockKey: active.blockKey,
      start: active.start,
      end: active.end,
      text: active.text,
      type: "comment",
      commentBody: [],
    });
    clear();
    toast("Comment added — click the circle to write");
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`${active.blockKey}-${active.start}-${active.end}`}
        ref={toolbarRef}
        data-anno-toolbar
        className="anno-toolbar"
        style={{
          position: "absolute",
          top,
          left,
          transformOrigin: "50% 100%",
        }}
        initial={{ opacity: 0, y: 8, scale: 0.6, x: "-50%" }}
        animate={{
          opacity: 1,
          y: -active.rect.height - 4,
          scale: 1,
          x: "-50%",
          transition: {
            type: "spring",
            stiffness: 520,
            damping: 22,
            mass: 0.7,
          },
        }}
        exit={{ opacity: 0, y: 4, scale: 0.7, x: "-50%", transition: { duration: 0.12 } }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {[
          {
            key: "highlight",
            el: (
              <ToolBtn label="Highlight" active={existing.highlight} onClick={onHighlight}>
                <LuHighlighter size={14} />
              </ToolBtn>
            ),
          },
          {
            key: "underline",
            el: (
              <ToolBtn label="Underline" active={existing.underline} onClick={onUnderline}>
                <LuUnderline size={14} />
              </ToolBtn>
            ),
          },
          {
            key: "copy",
            el: (
              <ToolBtn label="Copy" onClick={onCopy}>
                <LuCopy size={14} />
              </ToolBtn>
            ),
          },
          {
            key: "tag",
            el: (
              <ToolBtn label="Tag" onClick={onTag}>
                <LuTag size={14} />
              </ToolBtn>
            ),
          },
          {
            key: "comment",
            el: (
              <ToolBtn label="Comment" onClick={onComment}>
                <LuMessageSquare size={14} />
              </ToolBtn>
            ),
          },
          {
            key: "blur",
            el: (
              <ToolBtn
                label={existing.blur ? "Unblur" : "Blur"}
                active={existing.blur}
                onClick={onBlur}
              >
                <LuEyeOff size={14} />
              </ToolBtn>
            ),
          },
        ].map((b, i) => (
          <motion.div
            key={b.key}
            initial={{ opacity: 0, y: 6, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.04 + i * 0.035,
              type: "spring",
              stiffness: 600,
              damping: 18,
            }}
          >
            {b.el}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function ToolBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("anno-toolbar-btn", active && "anno-toolbar-btn-active")}
    >
      {children}
    </button>
  );
}

import { useEffect } from "react";

/**
 * Global delegated click handler that toggles `.anno-blur-revealed` on any
 * blurred-text segment when the user clicks it. Hover-to-reduce-blur is
 * handled purely in CSS.
 */
export function BlurRevealHandler() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const blurEl = t.closest(".anno-blur");
      if (!blurEl) return;
      // Don't intercept if the user is selecting (has dragged); allow toggle on simple click.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      blurEl.classList.toggle("anno-blur-revealed");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { firePageReaction } from "@/lib/gifReactionEngine";

/**
 * Fires a page-open GIF reaction on every route change (after the first
 * mount). Independent of the PageTransition visual effect so users see
 * reactions even if they disable transitions. Runs zero re-renders outside
 * of route changes.
 */
export function GifPageReactions() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    firePageReaction();
  }, [pathname]);

  return null;
}

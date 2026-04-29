/**
 * GIF Reaction Engine — lightweight, event-driven, zero React re-renders.
 *
 * - Lazily fetches /gifReactions.json the first time a reaction fires.
 * - Shows at most one GIF at a time via direct DOM manipulation.
 * - Theme/page categories always show (so the user notices the transition).
 * - Correct/wrong/fullmark categories show with a 70% probability.
 * - Clicking a running-theme GIF spawns the "hanging batman" that follows
 *   the cursor for 5s and drops off screen.
 *
 * Can be disabled globally via useAppSettingsStore.gifReactionsEnabled.
 */

import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

export type GifCategory =
  | "fullmark"
  | "correct"
  | "wrong"
  | "theme-light"
  | "theme-dark"
  | "page-open";

interface GifEntry {
  src: string;
  category: GifCategory;
  position: string;
  size: "small" | "medium" | "large" | "fullscreen";
  duration: number;
  weight: number;
  loop?: "playonce" | "infiniteloop" | number;
  animation?: string;
}

// ── Singleton state ──
let gifData: GifEntry[] | null = null;
let loading = false;
let activeTimeout: ReturnType<typeof setTimeout> | null = null;
let overlayEl: HTMLDivElement | null = null;

const SIZE_MAP: Record<string, number> = { small: 120, medium: 180, large: 260, fullscreen: 0 };
const SHOW_CHANCE = 0.7; // 70% chance for marking / page categories

const POSITION_STYLES: Record<string, Partial<CSSStyleDeclaration>> = {
  "bottom-left": { bottom: "24px", left: "24px" },
  "bottom-center": { bottom: "24px", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "24px", right: "24px" },
  "top-left": { top: "24px", left: "24px" },
  "top-right": { top: "24px", right: "24px" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

async function ensureData(): Promise<GifEntry[]> {
  if (gifData) return gifData;
  if (loading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (gifData) {
          clearInterval(check);
          resolve(gifData);
        }
      }, 50);
    });
  }
  loading = true;
  try {
    const res = await fetch("/gifReactions.json", {
      // Performance: cache-first strategy
      cache: "force-cache",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    gifData = await res.json();
  } catch {
    // Silently fail with empty array - don't block the app
    gifData = [];
  }
  loading = false;
  return gifData!;
}

async function createDecodedImage(src: string, isFullscreen: boolean = false) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    // Fullscreen uses object-fit cover, others use contain-style sizing
    img.style.objectFit = isFullscreen ? "cover" : "fill";
    img.style.width = isFullscreen ? "100vw" : "100%";
    img.style.height = isFullscreen ? "100vh" : "auto";
    img.decoding = "async";

    // Performance: Only load eagerly for small/medium, lazy for large+
    const isSmallOrMedium = !isFullscreen;
    img.loading = isSmallOrMedium ? "eager" : "lazy";

    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // Resolve even on error to not block
    img.src = src;
  });
}

function pickWeighted(entries: GifEntry[]): GifEntry {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function getOverlay(): HTMLDivElement {
  if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.id = "gif-reaction-overlay";
  Object.assign(overlayEl.style, {
    position: "fixed",
    zIndex: "9999",
    pointerEvents: "none",
    display: "none",
  });
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function clearActive() {
  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }
  const el = getOverlay();
  el.style.display = "none";
  el.innerHTML = "";
}

async function showRunningAnimation(gif: GifEntry, direction: "left-to-right" | "right-to-left") {
  if (activeTimeout) return;
  const el = getOverlay();
  el.style.cssText = "";
  const px = SIZE_MAP[gif.size] || 180;
  const isLeftToRight = direction === "left-to-right";
  const isTop = gif.position.startsWith("top");

  Object.assign(el.style, {
    position: "fixed",
    zIndex: "9999",
    pointerEvents: "auto",
    display: "block",
    cursor: "pointer",
    [isTop ? "top" : "bottom"]: "16px",
    left: "0px",
    top: isTop ? "16px" : "auto",
    bottom: isTop ? "auto" : "16px",
    willChange: "transform",
    transition: `transform ${gif.duration}ms linear`,
  });

  const img = await createDecodedImage(gif.src);
  img.style.width = `${px}px`;
  img.style.height = "auto";
  img.style.borderRadius = "12px";
  img.style.willChange = "transform";

  el.innerHTML = "";
  el.appendChild(img);

  const onClick = () => {
    el.removeEventListener("click", onClick);
    clearActive();
    spawnHangingBatman();
  };
  el.addEventListener("click", onClick);

  const vw = Math.max(320, window.innerWidth || 0);
  const startX = isLeftToRight ? -px : vw + px;
  const endX = isLeftToRight ? vw + px : -px;
  el.style.transform = `translate3d(${startX}px, 0, 0)`;
  requestAnimationFrame(() => {
    // One frame delay ensures the browser commits the starting transform
    // before we transition to the end transform (smoother, less layout jank).
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(${endX}px, 0, 0)`;
    });
  });

  activeTimeout = setTimeout(() => {
    el.removeEventListener("click", onClick);
    clearActive();
  }, gif.duration + 200);
}

function spawnHangingBatman() {
  const container = document.createElement("div");
  container.id = "hanging-batman";
  Object.assign(container.style, {
    position: "fixed",
    zIndex: "10000",
    pointerEvents: "none",
    willChange: "transform",
  });

  const swing = document.createElement("div");
  Object.assign(swing.style, {
    transformOrigin: "top center",
    animation: "batman-swing 1.2s ease-in-out infinite alternate",
  });

  const img = new Image();
  img.src = "/images/hangingbatman.png";
  Object.assign(img.style, {
    width: "120px",
    height: "auto",
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
  });
  swing.appendChild(img);
  container.appendChild(swing);

  if (!document.getElementById("batman-swing-style")) {
    const style = document.createElement("style");
    style.id = "batman-swing-style";
    style.textContent = `
      @keyframes batman-swing {
        0% { transform: rotate(-18deg); }
        100% { transform: rotate(18deg); }
      }
      @keyframes batman-drop {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(100vh) scale(0.2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);

  const onMove = (e: MouseEvent) => {
    container.style.left = `${e.clientX}px`;
    container.style.top = `${e.clientY}px`;
  };
  document.addEventListener("mousemove", onMove);

  container.style.left = `${window.innerWidth / 2}px`;
  container.style.top = `${window.innerHeight / 3}px`;

  setTimeout(() => {
    document.removeEventListener("mousemove", onMove);
    swing.style.animation = "none";
    container.style.transition = "none";
    container.style.animation = "batman-drop 1.2s ease-in forwards";
    setTimeout(() => container.remove(), 1300);
  }, 5000);
}

/**
 * Fire a GIF reaction. Marking categories roll a 70% show chance; theme/page
 * always show. Only one GIF runs at a time — later calls while one is
 * active are ignored.
 */
export async function fireGifReaction(category: GifCategory) {
  // Respect user setting (defaults to true)
  const enabled = useAppSettingsStore.getState().gifReactionsEnabled;
  if (enabled === false) return;

  const alwaysShow =
    category === "theme-light" || category === "theme-dark" || category === "page-open";

  if (!alwaysShow && Math.random() > SHOW_CHANCE) return;
  if (activeTimeout) return;

  const data = await ensureData();
  const pool = data.filter((g) => g.category === category);
  if (pool.length === 0) return;

  const gif = pickWeighted(pool);

  if (gif.animation === "run-left-to-right") {
    showRunningAnimation(gif, "left-to-right");
    return;
  }
  if (gif.animation === "run-right-to-left") {
    showRunningAnimation(gif, "right-to-left");
    return;
  }

  const el = getOverlay();
  const isFullscreen = gif.size === "fullscreen";
  const px = isFullscreen ? 0 : SIZE_MAP[gif.size] || 180;

  el.style.cssText = "";

  if (isFullscreen) {
    // Fullscreen: cover entire screen
    Object.assign(el.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "9999",
      pointerEvents: "none",
      display: "block",
      background: "rgba(0,0,0,0.85)",
    });

    const img = await createDecodedImage(gif.src, true);
    Object.assign(img.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "90vw",
      maxHeight: "85vh",
      width: "auto",
      height: "auto",
      borderRadius: "12px",
    });

    el.innerHTML = "";
    el.appendChild(img);

    // Fade in
    img.style.opacity = "0";
    requestAnimationFrame(() => {
      img.style.transition = "opacity 0.3s ease-out";
      img.style.opacity = "1";
    });
  } else {
    // Regular sizes
    Object.assign(el.style, {
      position: "fixed",
      zIndex: "9999",
      pointerEvents: "none",
      display: "block",
    });

    const posStyle = POSITION_STYLES[gif.position] || POSITION_STYLES["bottom-right"];
    Object.assign(el.style, posStyle);

    const img = await createDecodedImage(gif.src, false);
    img.style.width = `${px}px`;
    img.style.height = "auto";
    img.style.borderRadius = "12px";
    img.style.opacity = "0";
    img.style.transition = "opacity 0.2s ease-in";

    el.innerHTML = "";
    el.appendChild(img);

    requestAnimationFrame(() => {
      img.style.opacity = "1";
    });
  }

  activeTimeout = setTimeout(() => {
    const img = el.querySelector("img");
    if (img) {
      (img as HTMLImageElement).style.opacity = "0";
    }
    setTimeout(clearActive, 200);
  }, gif.duration);
}

export function fireMarkingReaction(awarded: number, max: number) {
  if (max <= 0) return;
  const pct = awarded / max;
  if (pct === 1) fireGifReaction("fullmark");
  else if (pct >= 0.5) fireGifReaction("correct");
  else fireGifReaction("wrong");
}

export function fireThemeReaction(isDark: boolean) {
  fireGifReaction(isDark ? "theme-dark" : "theme-light");
}

export function firePageReaction() {
  fireGifReaction("page-open");
}

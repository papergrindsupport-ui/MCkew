// Tiny wrapper around @tsparticles/confetti so callers don't need to import
// the package directly (and so SSR builds don't crash on `window`).

type ConfettiOpts = Record<string, unknown>;
type ConfettiFn = (opts?: ConfettiOpts) => Promise<unknown> | void;

let _confetti: ConfettiFn | null = null;
let _loading: Promise<void> | null = null;

async function ensure() {
  if (typeof window === "undefined") return;
  if (_confetti) return;
  if (!_loading) {
    _loading = import("@tsparticles/confetti").then((m) => {
      _confetti = m.confetti as unknown as ConfettiFn;
    });
  }
  await _loading;
}

export async function fireConfetti(opts?: ConfettiOpts) {
  await ensure();
  _confetti?.(opts);
}

/** Quick celebratory burst — short and lightweight. */
export async function celebrate() {
  await ensure();
  _confetti?.({
    particleCount: 80,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.7 },
    scalar: 0.9,
  });
}

/** Bigger celebration — for paper submit / completion. */
export async function bigCelebrate() {
  await ensure();
  if (!_confetti) return;
  const fire = (particleRatio: number, opts: ConfettiOpts) =>
    _confetti?.({
      particleCount: Math.floor(220 * particleRatio),
      origin: { y: 0.7 },
      ...opts,
    });
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

/** Side cannons — for major moments like exam completion. */
export async function sideCannons() {
  await ensure();
  if (!_confetti) return;
  const end = Date.now() + 1000;
  const colors = ["#ff5d8f", "#ffb84d", "#54d4a4", "#5db4ff", "#c084fc"];
  (function frame() {
    _confetti?.({
      particleCount: 4,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    _confetti?.({
      particleCount: 4,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

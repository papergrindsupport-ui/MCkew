import { useEffect, useMemo, useState } from "react";
import { LuPencil, LuEraser, LuRefreshCw } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useTheme } from "@/components/ThemeSwitcher";
import { RpsGame } from "./RpsGame";

/**
 * Loading screen shown while a paper is being prepared.
 * Includes:
 *   • A decorative CSS-only "swing" loader (the .paper-loader rules in styles.css).
 *   • A playable 3x3 tic-tac-toe vs a tiny minimax AI, where the player is the
 *     pencil ✏️ and the AI is the eraser 🧽 — keeps the user busy for the few
 *     seconds the route loader is running.
 */

type Cell = "P" | "E" | null; // P = pencil (player), E = eraser (AI)

const LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diags
];

function winnerOf(b: Cell[]): Cell | "draw" | null {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every(Boolean) ? "draw" : null;
}

// Minimax with alpha-beta pruning. AI is "E" and is the maximizer.
function minimax(b: Cell[], turn: Cell, alpha: number, beta: number): number {
  const w = winnerOf(b);
  if (w === "E") return 10;
  if (w === "P") return -10;
  if (w === "draw") return 0;

  if (turn === "E") {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "E";
        best = Math.max(best, minimax(b, "P", alpha, beta));
        b[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "P";
        best = Math.min(best, minimax(b, "E", alpha, beta));
        b[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function bestAiMove(b: Cell[]): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = "E";
      const s = minimax(b, "P", -Infinity, Infinity);
      b[i] = null;
      if (s > bestScore) {
        bestScore = s;
        move = i;
      }
    }
  }
  return move;
}

export function PaperLoadingScreen() {
  useTheme();
  const gameEnabled = useAppSettingsStore((s) => s.loadingGameEnabled);
  const gamePref = useAppSettingsStore((s) => s.loadingGame);
  // Defer the random pick until after mount so SSR and first client render
  // agree (avoids hydration mismatch). Default to tic-tac-toe pre-mount.
  const [chosen, setChosen] = useState<"tictactoe" | "rps">(() => {
    if (gamePref === "rps") return "rps";
    return "tictactoe";
  });
  useEffect(() => {
    if (gamePref === "tictactoe" || gamePref === "rps") return;
    setChosen(Math.random() < 0.5 ? "tictactoe" : "rps");
  }, [gamePref]);

  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(null));
  const [turn, setTurn] = useState<Cell>("P");
  const winner = useMemo(() => winnerOf(board), [board]);
  const isOver = winner !== null;

  // AI moves whenever it's its turn.
  useEffect(() => {
    if (isOver || turn !== "E") return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        if (winnerOf(prev) !== null) return prev;
        const m = bestAiMove([...prev]);
        if (m < 0) return prev;
        const next = [...prev];
        next[m] = "E";
        return next;
      });
      setTurn("P");
    }, 380);
    return () => clearTimeout(t);
  }, [turn, isOver]);

  const playCell = (i: number) => {
    if (turn !== "P" || isOver || board[i]) return;
    const next = [...board];
    next[i] = "P";
    setBoard(next);
    setTurn(winnerOf(next) ? "P" : "E");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("P");
  };

  const status =
    winner === "draw"
      ? "Draw — try again!"
      : winner === "P"
        ? "You won! 🎉 (good luck beating it twice…)"
        : winner === "E"
          ? "Eraser wins. Rematch?"
          : turn === "P"
            ? "Your move — place a pencil"
            : "Eraser is thinking…";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Decorative CSS loader */}
        <div className="paper-loader" aria-label="Loading" role="status" />

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Preparing your paper…</h1>
          {gameEnabled && (
            <p className="text-sm text-muted-foreground mt-1">
              {chosen === "tictactoe"
                ? "While we shuffle questions, beat the eraser at tic-tac-toe."
                : "While we shuffle questions, play rock paper scissors with Kiwi 🥝."}
            </p>
          )}
        </div>

        {gameEnabled && chosen === "rps" && <RpsGame />}

        {gameEnabled && chosen === "tictactoe" && (
          <div className="rounded-3xl border-2 border-border/60 bg-card p-4 sm:p-5 shadow-lg w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
                  <LuPencil size={12} /> You
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
                  <LuEraser size={12} /> Kiwi
                </span>
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border-2 border-border/60 hover:border-primary hover:text-primary transition"
                title="Reset board"
              >
                <LuRefreshCw size={12} /> Reset
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 aspect-square">
              {board.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playCell(i);
                  }}
                  disabled={isOver || !!cell || turn !== "P"}
                  className={cn(
                    "rounded-2xl border-2 border-border/60 bg-background flex items-center justify-center transition",
                    "hover:border-primary/60",
                    cell ? "cursor-default" : "cursor-pointer",
                    (isOver || !!cell || turn !== "P") && "hover:border-border/60 opacity-100",
                  )}
                  aria-label={`Cell ${i + 1}${cell ? ` — ${cell === "P" ? "pencil" : "eraser"}` : ""}`}
                >
                  {cell === "P" && <LuPencil size={28} className="text-primary" />}
                  {cell === "E" && <LuEraser size={28} className="text-muted-foreground" />}
                </button>
              ))}
            </div>

            <p className="text-center text-xs font-semibold text-muted-foreground mt-3">
              {status.replace("Eraser", "Kiwi")}
            </p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80">
          The paper will load automatically — keep playing.
        </p>
      </div>
    </div>
  );
}

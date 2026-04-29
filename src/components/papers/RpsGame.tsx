import { useState } from "react";
import { LuRefreshCw, LuHand } from "react-icons/lu";
import { cn } from "@/lib/utils";

type Move = "rock" | "paper" | "scissors";

const MOVES: { key: Move; label: string; emoji: string; letter: "A" | "B" | "C" }[] = [
  { key: "rock", label: "Rock", emoji: "🪨", letter: "A" },
  { key: "scissors", label: "Scissors", emoji: "✂️", letter: "B" },
  { key: "paper", label: "Paper", emoji: "📄", letter: "C" },
];

function beats(a: Move, b: Move) {
  return (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  );
}

function label(m: Move) {
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function RpsGame() {
  const [you, setYou] = useState<Move | null>(null);
  const [kiwi, setKiwi] = useState<Move | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [score, setScore] = useState({ you: 0, kiwi: 0 });

  const play = (m: Move) => {
    const k = MOVES[Math.floor(Math.random() * 3)].key;
    setYou(m);
    setKiwi(k);
    if (m === k) setResult("draw");
    else if (beats(m, k)) {
      setResult("win");
      setScore((s) => ({ ...s, you: s.you + 1 }));
    } else {
      setResult("lose");
      setScore((s) => ({ ...s, kiwi: s.kiwi + 1 }));
    }
  };

  const reset = () => {
    setYou(null);
    setKiwi(null);
    setResult(null);
  };

  const status = (() => {
    if (!result || !you || !kiwi) return "Pick A, B, or C — Kiwi is waiting 🥝";
    if (result === "draw") return `Draw! You both chose ${label(you)}.`;
    if (result === "win") return `You won! ${label(you)} beats ${label(kiwi)} — Kiwi cries 🥺`;
    return `You lost! ${label(kiwi)} beats ${label(you)} — Kiwi wins 🥝✨`;
  })();

  return (
    <div className="rounded-3xl border-2 border-border/60 bg-card p-4 sm:p-5 shadow-lg w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
            <LuHand size={12} /> You {score.you}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
            🥝 Kiwi {score.kiwi}
          </span>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border-2 border-border/60 hover:border-primary hover:text-primary transition"
          title="Reset round"
        >
          <LuRefreshCw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 my-4">
        <div className="rounded-2xl bg-background border-2 border-border/60 p-4 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            You
          </span>
          <span className="text-5xl mt-2">
            {you ? MOVES.find((m) => m.key === you)!.emoji : "❔"}
          </span>
        </div>
        <div className="rounded-2xl bg-background border-2 border-border/60 p-4 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Kiwi 🥝
          </span>
          <span className="text-5xl mt-2">
            {kiwi ? MOVES.find((m) => m.key === kiwi)!.emoji : "❔"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MOVES.map((m) => (
          <button
            key={m.key}
            onClick={() => play(m.key)}
            className={cn(
              "rounded-2xl border-2 border-border/60 bg-background p-3 flex flex-col items-center gap-1 transition hover:border-primary/60 cursor-pointer",
            )}
          >
            <span className="text-[10px] font-bold text-muted-foreground">{m.letter}.</span>
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[11px] font-bold">{m.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs font-semibold text-muted-foreground mt-3">{status}</p>
    </div>
  );
}

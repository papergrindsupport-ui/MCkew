import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppSettingsStore, type LoadingGame } from "@/stores/useAppSettingsStore";
import { LuWaves, LuGamepad2, LuDice5, LuSparkles, LuTextCursor } from "react-icons/lu";
import { cn } from "@/lib/utils";

const GAME_OPTIONS: { key: LoadingGame; label: string; desc: string; emoji: string }[] = [
  { key: "tictactoe", label: "Tic-tac-toe", desc: "Pencil vs Kiwi 🧽", emoji: "⭕" },
  { key: "rps", label: "Rock Paper Scissors", desc: "Play vs Kiwi 🥝", emoji: "✂️" },
  { key: "random", label: "Randomize", desc: "Surprise me every time", emoji: "🎲" },
];

export function DashboardSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pageTransitionsEnabled = useAppSettingsStore((s) => s.pageTransitionsEnabled);
  const setPageTransitionsEnabled = useAppSettingsStore((s) => s.setPageTransitionsEnabled);
  const loadingGameEnabled = useAppSettingsStore((s) => s.loadingGameEnabled);
  const setLoadingGameEnabled = useAppSettingsStore((s) => s.setLoadingGameEnabled);
  const loadingGame = useAppSettingsStore((s) => s.loadingGame);
  const setLoadingGame = useAppSettingsStore((s) => s.setLoadingGame);
  const gifReactionsEnabled = useAppSettingsStore((s) => s.gifReactionsEnabled);
  const setGifReactionsEnabled = useAppSettingsStore((s) => s.setGifReactionsEnabled);
  const showTextPopover = useAppSettingsStore((s) => s.showTextPopover);
  const setShowTextPopover = useAppSettingsStore((s) => s.setShowTextPopover);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>Control page transitions and the loading mini-game.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <label className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 px-4 py-3 bg-card/50 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-medium">
              <LuWaves size={16} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-bold">Liquid page transitions</span>
                <span className="text-xs text-muted-foreground">
                  Smooth blob sweep when switching pages
                </span>
              </span>
            </span>
            <Switch checked={pageTransitionsEnabled} onCheckedChange={setPageTransitionsEnabled} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 px-4 py-3 bg-card/50 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-medium">
              <LuSparkles size={16} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-bold">GIF reactions</span>
                <span className="text-xs text-muted-foreground">
                  Fun reactions on theme toggle, page change &amp; marking
                </span>
              </span>
            </span>
            <Switch checked={gifReactionsEnabled} onCheckedChange={setGifReactionsEnabled} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 px-4 py-3 bg-card/50 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-medium">
              <LuTextCursor size={16} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-bold">Show text popover</span>
                <span className="text-xs text-muted-foreground">
                  Floating toolbar to highlight, underline, tag, comment, blur or copy selected text
                </span>
              </span>
            </span>
            <Switch checked={showTextPopover} onCheckedChange={setShowTextPopover} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 px-4 py-3 bg-card/50 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-medium">
              <LuGamepad2 size={16} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-bold">Play mini-game while loading</span>
                <span className="text-xs text-muted-foreground">
                  Keeps you entertained while papers load
                </span>
              </span>
            </span>
            <Switch checked={loadingGameEnabled} onCheckedChange={setLoadingGameEnabled} />
          </label>

          <div
            className={cn(
              "rounded-2xl border-2 border-border/60 p-4 bg-card/50 transition-opacity",
              !loadingGameEnabled && "opacity-50 pointer-events-none",
            )}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <LuDice5 size={12} /> Which game?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GAME_OPTIONS.map((g) => {
                const active = loadingGame === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setLoadingGame(g.key)}
                    className={cn(
                      "rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition cursor-pointer",
                      active
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40 bg-background",
                    )}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-xs font-bold">{g.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">
                      {g.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLayoutStore, type PapersLayout } from "@/stores/useLayoutStore";
import { LuLayoutGrid, LuListTree, LuRoute, LuLock, LuTag } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const OPTIONS: {
  key: PapersLayout;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  Preview: React.FC;
}[] = [
  {
    key: "bento",
    title: "Bento Grid",
    desc: "Beautifully scattered cards in a colorful bento grid, color-coded per subject.",
    Icon: LuLayoutGrid,
    Preview: () => (
      <div className="grid grid-cols-4 grid-rows-3 gap-1 w-full h-24">
        <div className="col-span-2 row-span-2 bg-emerald-300/70 rounded-md" />
        <div className="bg-violet-300/70 rounded-md" />
        <div className="bg-sky-300/70 rounded-md row-span-2" />
        <div className="bg-violet-300/70 rounded-md" />
        <div className="col-span-2 bg-sky-300/70 rounded-md" />
        <div className="bg-emerald-300/70 rounded-md" />
        <div className="bg-violet-300/70 rounded-md" />
      </div>
    ),
  },
  {
    key: "organized",
    title: "Organized",
    desc: "Collapsible sections nested by Subject → Year → Session → Variant.",
    Icon: LuListTree,
    Preview: () => (
      <div className="flex flex-col gap-1 w-full h-24 text-[8px]">
        <div className="bg-emerald-300/70 rounded px-1.5 py-0.5">▼ Biology</div>
        <div className="ml-2 bg-emerald-200/70 rounded px-1.5 py-0.5">▼ 2026</div>
        <div className="ml-4 bg-background/80 rounded px-1.5 py-0.5">▶ June</div>
        <div className="bg-violet-300/70 rounded px-1.5 py-0.5">▶ Chemistry</div>
        <div className="bg-sky-300/70 rounded px-1.5 py-0.5">▶ Physics</div>
      </div>
    ),
  },
  {
    key: "multistep",
    title: "Multistep",
    desc: "Step-by-step breadcrumbs: Subject → Year → Session → Variant.",
    Icon: LuRoute,
    Preview: () => (
      <div className="flex flex-col gap-1.5 w-full h-24 text-[8px] justify-center">
        <div className="flex gap-1">
          <span className="bg-emerald-300/70 rounded px-1.5 py-0.5">Biology</span>
          <span>›</span>
          <span className="bg-muted rounded px-1.5 py-0.5">2026</span>
          <span>›</span>
          <span className="bg-muted/60 rounded px-1.5 py-0.5">June</span>
        </div>
        <div className="bg-foreground text-background rounded px-2 py-1 text-center font-bold">
          Start solving →
        </div>
      </div>
    ),
  },
];

export function LayoutChooserModal({
  open,
  onClose,
  firstTime = false,
}: {
  open: boolean;
  onClose: () => void;
  firstTime?: boolean;
}) {
  const setLayout = useLayoutStore((s) => s.setLayout);
  const current = useLayoutStore((s) => s.layout);
  const hideLocked = useLayoutStore((s) => s.hideLocked);
  const setHideLocked = useLayoutStore((s) => s.setHideLocked);
  const hideTags = useLayoutStore((s) => s.hideTags);
  const setHideTags = useLayoutStore((s) => s.setHideTags);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {firstTime ? "Welcome! Pick your layout" : "Switch layout"}
          </DialogTitle>
          <DialogDescription>
            Choose how you want your papers to be displayed. You can change this anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {OPTIONS.map(({ key, title, desc, Icon, Preview }) => {
            const active = current === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setLayout(key);
                  onClose();
                }}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left flex flex-col gap-3 transition-all hover:scale-[1.02]",
                  active
                    ? "border-primary bg-primary/5 ring-4 ring-primary/20"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-primary" />
                  <span className="font-bold">{title}</span>
                </div>
                <div className="rounded-xl bg-muted/50 p-2 border border-border/50">
                  <Preview />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border/60">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Display settings
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 bg-card/50 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-medium">
                <LuLock size={14} className="text-muted-foreground" />
                Hide locked papers
              </span>
              <Switch checked={hideLocked} onCheckedChange={setHideLocked} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 bg-card/50 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-medium">
                <LuTag size={14} className="text-muted-foreground" />
                Hide all tags on cards
              </span>
              <Switch checked={hideTags} onCheckedChange={setHideTags} />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

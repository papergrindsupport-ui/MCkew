import { useState } from "react";
import { LuRotateCcw } from "react-icons/lu";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePaperSession } from "./PaperSession";

export function ResetPaperButton() {
  const session = usePaperSession();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() => setOpen(true)}
      >
        <LuRotateCcw size={14} /> Reset
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reset paper?</DialogTitle>
            <DialogDescription>
              This clears all your answers, eliminations, timers and stopwatch laps. You can't undo
              this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                session.resetPaper();
                setOpen(false);
                toast.success("Paper reset");
              }}
            >
              Yes, reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

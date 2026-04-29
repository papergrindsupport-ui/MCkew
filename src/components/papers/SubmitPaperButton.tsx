import { useState } from "react";
import { LuFileCheck } from "react-icons/lu";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePaperSession } from "./PaperSession";
import { fmt } from "./FloatingTimers";

type DialogKind = "empty" | "confirm" | "ranOutOfTime" | null;

export function SubmitPaperButton() {
  const session = usePaperSession();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dontAskEmpty, setDontAskEmpty] = useState(false);
  const [dontAskConfirm, setDontAskConfirm] = useState(false);

  if (session.paperSubmitted) return null;
  if (session.settings.submissionMode !== "end-of-paper") return null;

  const expiredTimer = session.timers.find((t) => t.expired);

  const doSubmit = () => {
    session.submitPaper();
    if (session.settings.timed && session.timers.length > 0) {
      const t = session.timers[0];
      if (t.remainingSec > 0) {
        toast.success(`🎉 Great — finished with ${fmt(t.remainingSec)} remaining!`);
      } else {
        toast(`Try to be faster next time!`, { icon: "⏱️" });
      }
    } else {
      toast.success("Paper submitted!");
    }
  };

  const onClick = () => {
    if (expiredTimer && !session.settings.autoSubmitOnTimeUp) {
      setDialog("ranOutOfTime");
      return;
    }
    if (session.attemptedCount === 0 && !session.settings.dontAskEmptySubmit) {
      setDialog("empty");
      return;
    }
    if (!session.settings.dontAskSubmitConfirm) {
      setDialog("confirm");
      return;
    }
    doSubmit();
  };

  return (
    <>
      <div className="mt-8 flex justify-center">
        <Button onClick={onClick} size="lg" className="rounded-full gap-2 px-8">
          <LuFileCheck size={18} /> Submit paper
        </Button>
      </div>

      {/* Empty submit */}
      <Dialog open={dialog === "empty"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Submit without attempting any question?</DialogTitle>
            <DialogDescription>
              You haven't selected an answer for any question yet. All 40 questions will be marked
              as unattempted.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <Checkbox checked={dontAskEmpty} onCheckedChange={(v) => setDontAskEmpty(v === true)} />
            Don't ask again
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              No, go back
            </Button>
            <Button
              onClick={() => {
                if (dontAskEmpty) {
                  session.setSettings({ ...session.settings, dontAskEmptySubmit: true });
                }
                setDialog(null);
                doSubmit();
              }}
            >
              Yes, submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm submit */}
      <Dialog open={dialog === "confirm"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Submit paper?</DialogTitle>
            <DialogDescription>
              You attempted {session.attemptedCount}/{session.questions.length} questions. After
              submitting, you'll see your mark and grade.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <Checkbox
              checked={dontAskConfirm}
              onCheckedChange={(v) => setDontAskConfirm(v === true)}
            />
            Don't show again
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dontAskConfirm) {
                  session.setSettings({ ...session.settings, dontAskSubmitConfirm: true });
                }
                setDialog(null);
                doSubmit();
              }}
            >
              Yes, submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ran out of time */}
      <Dialog open={dialog === "ranOutOfTime"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>You ran out of time btw!</DialogTitle>
            <DialogDescription>
              Your timer hit zero before you submitted. Hurry up next time! Submit anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDialog(null);
                doSubmit();
              }}
            >
              I will — submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

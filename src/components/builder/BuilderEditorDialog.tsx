import { useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuilderDialogContent } from "./BuilderDialogShell";
import { Button } from "@/components/ui/button";
import { QuestionForm, emptyQuestion } from "@/admin/QuestionForm";
import type { Question, OptionLetter } from "@/data/questionData";
import {
  BUILDER_PAPER_ID,
  getBuilderCorrectLetter,
  setBuilderCorrectLetter,
  uidLocal,
} from "./builderQuestionHelpers";
import { LuTriangleAlert } from "react-icons/lu";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When provided, dialog is in edit mode for this question. Else create. */
  question: Question | null;
  /** "edit-snapshot" shows a "not recommended" warning. */
  mode: "edit-snapshot" | "edit-custom" | "create-custom";
  onSave: (q: Question) => void;
}

export function BuilderEditorDialog({ open, onOpenChange, question, mode, onSave }: Props) {
  const [draft, setDraft] = useState<Question>(() =>
    question ? { ...question } : emptyQuestion(BUILDER_PAPER_ID, 1),
  );
  const [letter, setLetter] = useState<OptionLetter | null>(() =>
    question ? getBuilderCorrectLetter(question.id) : "A",
  );

  useEffect(() => {
    if (open) {
      const next = question
        ? { ...question }
        : { ...emptyQuestion(BUILDER_PAPER_ID, 1), id: uidLocal("cq") };
      setDraft(next);
      setLetter(question ? getBuilderCorrectLetter(question.id) : "A");
    }
  }, [open, question]);

  const handleSave = () => {
    setBuilderCorrectLetter(draft.id, letter);
    onSave(draft);
    onOpenChange(false);
  };

  const title =
    mode === "create-custom"
      ? "Create a custom question"
      : mode === "edit-custom"
        ? "Edit custom question"
        : "Edit question";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BuilderDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {mode === "edit-snapshot" && (
          <div className="flex items-start gap-2 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <LuTriangleAlert className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Editing is not recommended.</strong> You're editing a snapshot for this
              builder only — the original paper question is unchanged. If you change the answer or
              text, students may see a different question than originally intended.
            </p>
          </div>
        )}
        <div className="mt-2">
          <QuestionForm
            question={draft}
            onChange={setDraft}
            correctLetter={letter}
            onCorrectLetterChange={setLetter}
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </BuilderDialogContent>
    </Dialog>
  );
}

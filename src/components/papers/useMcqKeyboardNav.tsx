// Hooks for arrow-key MCQ navigation across questions, plus a one-time
// "you can use the arrow keys" toast. Disabled when the user is typing in
// an input, when the question is marked, or when the keyboardNav setting
// is off.

import { useEffect, type RefObject } from "react";
import toast from "react-hot-toast";
import type { MCQOptions, OptionLetter } from "@/data/questionData";
import { optionLetters } from "./OptionsView";
import { usePaperSession } from "./PaperSession";

const HINT_FLAG_KEY = "mcq-keyboard-nav-hint-shown";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * One-time hint toast shown the first time the user lands on a page that
 * has MCQ questions. Persists in localStorage. The toast offers a Disable
 * button that flips the keyboardNav session setting off.
 */
export function useKeyboardNavHint(hasQuestions: boolean) {
  const session = usePaperSession();
  useEffect(() => {
    if (!hasQuestions) return;
    if (typeof window === "undefined") return;
    if (!session.settings.keyboardNav) return;
    try {
      if (localStorage.getItem(HINT_FLAG_KEY) === "1") return;
      localStorage.setItem(HINT_FLAG_KEY, "1");
    } catch {
      return;
    }
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          <span>
            You can use the <b>Arrow keys</b> to navigate!
          </span>
          <button
            onClick={() => {
              session.setSettings({ ...session.settings, keyboardNav: false });
              toast.dismiss(t.id);
            }}
            className="px-2 py-1 rounded-md text-xs font-bold border border-border bg-background hover:bg-muted"
          >
            Disable
          </button>
        </span>
      ),
      { duration: 6000, icon: "⌨️" },
    );
    // We intentionally only run on first mount when hasQuestions is true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuestions]);
}

/**
 * Per-question arrow-key handler. The handler is global, but only acts when
 * the question's element is the most-visible question on screen — tracked
 * via a tiny IntersectionObserver per article.
 */
export function useMcqKeyboardNav({
  questionId,
  options,
  selected,
  onSelect,
  elementRef,
  enabled,
}: {
  questionId: string;
  options?: MCQOptions;
  selected: OptionLetter | null | undefined;
  onSelect: (letter: OptionLetter) => void;
  elementRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled || !options) return;
    const el = elementRef.current;
    if (!el || typeof window === "undefined") return;

    const letters = optionLetters(options);
    if (letters.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Only react if this question is the most-visible one.
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const visible = rect.top < vh * 0.6 && rect.bottom > vh * 0.2;
      if (!visible) return;

      const idx = selected ? letters.indexOf(selected) : -1;
      if (e.key === "ArrowRight") {
        if (idx === -1) {
          e.preventDefault();
          onSelect(letters[0]);
        } else if (idx < letters.length - 1) {
          e.preventDefault();
          onSelect(letters[idx + 1]);
        } else {
          // jump to next question
          e.preventDefault();
          jumpQuestion(el, "next");
        }
      } else if (e.key === "ArrowLeft") {
        if (idx <= 0) {
          e.preventDefault();
          jumpQuestion(el, "prev");
        } else {
          e.preventDefault();
          onSelect(letters[idx - 1]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, options, selected, onSelect, elementRef, questionId]);
}

function jumpQuestion(currentEl: HTMLElement, dir: "next" | "prev") {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>('[id^="question-"], [id^="smartq-"]'),
  );
  const idx = all.indexOf(currentEl);
  if (idx === -1) return;
  const target = dir === "next" ? all[idx + 1] : all[idx - 1];
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

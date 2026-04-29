// Tracks the last-viewed question per paper session so we can auto-scroll to
// it when the user reloads / re-opens the paper. localStorage-only.

const KEY = (persistKey: string) => `${persistKey}:lastQ`;

export function setLastQuestion(persistKey: string, questionNumber: string | number) {
  if (typeof window === "undefined" || !persistKey) return;
  try {
    window.localStorage.setItem(KEY(persistKey), String(questionNumber));
  } catch {
    /* quota — ignore */
  }
}

export function getLastQuestion(persistKey: string): string | null {
  if (typeof window === "undefined" || !persistKey) return null;
  try {
    return window.localStorage.getItem(KEY(persistKey));
  } catch {
    return null;
  }
}

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Context that scopes selection annotations to a particular question.
 * Provided by QuestionView; consumed by AnnotatableBlock + SelectionPopover.
 *
 * `qkey` matches the existing useAnnotationsStore.qkey() (paperId::qid).
 * `blockNamespace` lets a question scope multiple RichTextView usages
 * (e.g. "intro", "text") so block paths don't collide.
 */
export interface SelectionAnnotationCtx {
  qkey: string;
  blockNamespace: string;
  /** Builds the full storage key for a block. */
  buildBlockKey: (path: string) => string;
}

const Ctx = createContext<SelectionAnnotationCtx | null>(null);

export function SelectionAnnotationProvider({
  qkey,
  blockNamespace,
  children,
}: {
  qkey: string;
  blockNamespace: string;
  children: ReactNode;
}) {
  const value = useMemo<SelectionAnnotationCtx>(
    () => ({
      qkey,
      blockNamespace,
      buildBlockKey: (path) => `${qkey}::${blockNamespace}:${path}`,
    }),
    [qkey, blockNamespace],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectionAnnotationCtx(): SelectionAnnotationCtx | null {
  return useContext(Ctx);
}

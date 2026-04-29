import { Fragment } from "react";
import * as ReactKatex from "react-katex";
// react-katex is published as CJS. Depending on how Vite's SSR / dev runner
// interops the module, the named exports may live directly on the namespace
// OR nested under `.default`. Resolve both shapes to be safe.
const _katex: any = (ReactKatex as any).default ?? ReactKatex;
const InlineMath = _katex.InlineMath;
const BlockMath = _katex.BlockMath;
import { cn } from "@/lib/utils";
import type {
  RichBlock,
  ListBlock,
  RichText,
  RichNode,
  Run,
  InlineMark,
} from "@/data/questionData";
import { HighlightedText } from "@/components/smart-solve/HighlightContext";
import { AnnotatableBlock } from "@/components/annotations/AnnotatableBlock";
import { useSelectionAnnotationCtx } from "@/components/annotations/SelectionAnnotationContext";

const MARK_CLASSES: Record<InlineMark, string> = {
  bold: "font-bold",
  italic: "italic",
  underline: "underline underline-offset-2",
  strike: "line-through opacity-70",
  sub: "align-sub text-[0.75em]",
  sup: "align-super text-[0.75em]",
  highlight: "bg-yellow-300/60 dark:bg-yellow-400/30 px-0.5 rounded",
  muted: "text-muted-foreground",
  code: "font-mono text-[0.9em] bg-muted px-1 py-0.5 rounded",
};

function applyMarks(node: React.ReactNode, marks: InlineMark[] | undefined): React.ReactNode {
  if (!marks || marks.length === 0) return node;
  const className = marks.map((m) => MARK_CLASSES[m]).join(" ");
  if (marks.includes("sub")) return <sub className={className}>{node}</sub>;
  if (marks.includes("sup")) return <sup className={className}>{node}</sup>;
  return <span className={className}>{node}</span>;
}

function RunView({ run }: { run: Run }) {
  if (run.type === "br") return <br />;
  if (run.type === "latex") {
    if (run.display) {
      return (
        <span className="block my-2 max-w-full overflow-x-auto overflow-y-hidden katex-scroll">
          <BlockMath math={run.tex} />
        </span>
      );
    }
    return (
      <span className="inline-block max-w-full overflow-x-auto overflow-y-hidden align-middle katex-scroll">
        <InlineMath math={run.tex} />
      </span>
    );
  }
  return <>{applyMarks(<HighlightedText text={run.text} />, run.marks)}</>;
}

function isList(node: RichNode): node is ListBlock {
  return (node as ListBlock).kind === "ul" || (node as ListBlock).kind === "ol";
}

function BlockView({ block }: { block: RichBlock }) {
  return <BlockViewImpl block={block} blockPath="b" />;
}

function BlockViewImpl({ block, blockPath }: { block: RichBlock; blockPath: string }) {
  const annoCtx = useSelectionAnnotationCtx();
  const align =
    block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";

  if (annoCtx) {
    const className =
      block.kind === "h1"
        ? cn("text-2xl sm:text-3xl font-bold mt-2 mb-1", align)
        : block.kind === "h2"
          ? cn("text-xl sm:text-2xl font-bold mt-2 mb-1", align)
          : block.kind === "h3"
            ? cn("text-lg font-bold mt-2 mb-1", align)
            : cn("leading-relaxed", align);
    const Tag = block.kind === "p" ? "p" : block.kind;
    return (
      <AnnotatableBlock
        runs={block.runs}
        blockPath={blockPath}
        as={Tag as keyof React.JSX.IntrinsicElements}
        className={className}
      />
    );
  }

  const inner = block.runs.map((r, i) => (
    <Fragment key={i}>
      <RunView run={r} />
    </Fragment>
  ));
  switch (block.kind) {
    case "h1":
      return <h1 className={cn("text-2xl sm:text-3xl font-bold mt-2 mb-1", align)}>{inner}</h1>;
    case "h2":
      return <h2 className={cn("text-xl sm:text-2xl font-bold mt-2 mb-1", align)}>{inner}</h2>;
    case "h3":
      return <h3 className={cn("text-lg font-bold mt-2 mb-1", align)}>{inner}</h3>;
    default:
      return <p className={cn("leading-relaxed", align)}>{inner}</p>;
  }
}

function ListView({ list }: { list: ListBlock }) {
  return <ListViewImpl list={list} blockPath="l" />;
}

function ListViewImpl({ list, blockPath }: { list: ListBlock; blockPath: string }) {
  const annoCtx = useSelectionAnnotationCtx();
  const Tag = list.kind === "ol" ? "ol" : "ul";
  const listClass =
    list.kind === "ol"
      ? "list-decimal pl-6 space-y-1 marker:text-primary marker:font-bold"
      : "list-disc pl-6 space-y-1 marker:text-primary";
  return (
    <Tag className={cn(listClass, "leading-relaxed")}>
      {list.items.map((runs, i) => (
        <li key={i}>
          {annoCtx ? (
            <AnnotatableBlock runs={runs} blockPath={`${blockPath}:${i}`} />
          ) : (
            runs.map((r, ri) => (
              <Fragment key={ri}>
                <RunView run={r} />
              </Fragment>
            ))
          )}
        </li>
      ))}
    </Tag>
  );
}

export function RichTextView({ rich, className }: { rich: RichText; className?: string }) {
  return (
    <div className={cn("space-y-2 text-foreground", className)}>
      {rich.map((node, i) =>
        isList(node) ? (
          <ListViewImpl key={i} list={node} blockPath={`l${i}`} />
        ) : (
          <BlockViewImpl key={i} block={node} blockPath={`b${i}`} />
        ),
      )}
    </div>
  );
}

/** Inline-only renderer (no block paragraphs) for use inside table cells / titles. */
export function RichTextInline({ rich, className }: { rich: RichText; className?: string }) {
  return (
    <span className={className}>
      {rich.map((node, bi) => {
        if (isList(node)) return <ListView key={bi} list={node} />;
        return (
          <span
            key={bi}
            className={cn(
              node.align === "center" && "block text-center",
              node.align === "right" && "block text-right",
            )}
          >
            {node.runs.map((r, ri) => (
              <Fragment key={ri}>
                <RunView run={r} />
              </Fragment>
            ))}
          </span>
        );
      })}
    </span>
  );
}

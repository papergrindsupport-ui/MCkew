import { cn } from "@/lib/utils";
import type { ImageBlock } from "@/data/questionData";
import { RichTextInline } from "./RichTextView";

const SIZE_CLASS: Record<NonNullable<ImageBlock["size"]>, string> = {
  sm: "max-w-[200px]",
  md: "max-w-sm",
  lg: "max-w-2xl",
};

export function ImageBlockView({ block }: { block: ImageBlock }) {
  const sizeClass = SIZE_CLASS[block.size ?? "md"];
  const isDiagram = block.imageType === "Diagram";

  return (
    <figure className={cn("flex flex-col gap-2 mx-auto", sizeClass)}>
      {block.title && (
        <figcaption
          className={cn("text-sm font-medium", block.titleCentered ? "text-center" : "text-left")}
        >
          <RichTextInline rich={block.title} />
        </figcaption>
      )}
      <div
        className={cn(
          "rounded-xl overflow-hidden border-2 border-border/50 bg-card",
          isDiagram && "diagram-img",
        )}
      >
        <img
          src={block.src}
          alt={block.alt}
          loading="lazy"
          className={cn(
            "w-full h-auto block",
            isDiagram && "mix-blend-multiply dark:mix-blend-screen dark:invert",
          )}
        />
      </div>
      {block.caption && (
        <figcaption className="text-xs text-muted-foreground text-center">
          <RichTextInline rich={block.caption} />
        </figcaption>
      )}
    </figure>
  );
}

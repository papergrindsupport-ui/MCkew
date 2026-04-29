import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LuEllipsis,
  LuFileText,
  LuClipboardList,
  LuTarget,
  LuExternalLink,
  LuMessageSquarePlus,
  LuTag,
  LuHardDriveDownload,
  LuArrowRight,
} from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Paper } from "@/data/paperData";
import { cn } from "@/lib/utils";
import { CommentDialog, TagsDialog } from "@/components/papers/QuestionAnnotations";
import { SaveToDeskModal, type SaveTarget } from "@/components/desk/SaveToDeskModal";

export function QuestionCardMenu({
  paper,
  qid,
  className,
}: {
  paper: Paper;
  /** Question id — when provided, enables Add comment / Add tag actions. */
  qid?: string;
  className?: string;
}) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const links: { label: string; icon: typeof LuFileText; href?: string }[] = [
    { label: "Paper link", icon: LuFileText, href: paper.qpLink },
    { label: "Markscheme link", icon: LuClipboardList, href: paper.msLink },
    { label: "GTs link", icon: LuTarget, href: paper.gtLink },
  ];

  const saveTarget: SaveTarget | null = qid ? { kind: "question", paperId: paper.id, qid } : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Question menu"
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/50 bg-background/60 hover:border-primary/60 hover:text-primary transition",
              className,
            )}
          >
            <LuEllipsis size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {qid && (
            <>
              <DropdownMenuItem onSelect={() => setSaveOpen(true)} className="text-xs">
                <LuHardDriveDownload size={12} /> Save to desk
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs">
                <Link
                  to="/smart-solve-papers/$paperId"
                  params={{ paperId: paper.id }}
                  className="cursor-pointer"
                >
                  <LuArrowRight size={12} /> Go to paper
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCommentOpen(true)} className="text-xs">
                <LuMessageSquarePlus size={12} /> Add comment
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTagsOpen(true)} className="text-xs">
                <LuTag size={12} /> Manage tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {links.map((it) => {
            const Icon = it.icon;
            if (!it.href) {
              return (
                <DropdownMenuItem
                  key={it.label}
                  disabled
                  className="opacity-50 cursor-not-allowed text-xs"
                >
                  <Icon size={12} /> {it.label}
                  <span className="ml-auto text-[10px]">N/A</span>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem key={it.label} asChild className="text-xs">
                <a
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <Icon size={12} /> {it.label}
                  <LuExternalLink size={10} className="ml-auto" />
                </a>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {qid && (
        <>
          <CommentDialog
            open={commentOpen}
            onOpenChange={setCommentOpen}
            paperId={paper.id}
            qid={qid}
          />
          <TagsDialog open={tagsOpen} onOpenChange={setTagsOpen} paperId={paper.id} qid={qid} />
        </>
      )}
      <SaveToDeskModal open={saveOpen} onOpenChange={setSaveOpen} target={saveTarget} />
    </>
  );
}

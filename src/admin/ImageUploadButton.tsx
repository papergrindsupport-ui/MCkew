// Admin question image upload via UploadThing (stores files on UT CDN; URLs saved in question JSON → Supabase).
import "@uploadthing/react/styles.css";
import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { generateUploadDropzone } from "@uploadthing/react";
import { LuCloudUpload } from "react-icons/lu";
import type { AppFileRouter } from "@/server/uploadthingRouter";
import { getClerkJwtForApi } from "@/lib/getClerkApiJwt";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const QuestionImageDropzone = generateUploadDropzone<AppFileRouter>({
  url: "/api/uploadthing",
});

function pickPublicUrl(file: { url?: string; ufsUrl?: string } | undefined): string | null {
  if (!file) return null;
  const u = file.ufsUrl || file.url;
  return u && typeof u === "string" ? u : null;
}

export function ImageUploadButton({
  onUploaded,
  label = "Upload image",
  className,
  compact,
}: {
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
  /** Smaller drop target for dense layouts (e.g. image MCQ grid). */
  compact?: boolean;
}) {
  const { getToken, isSignedIn } = useAuth();

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    if (!isSignedIn) return {};
    const t = await getClerkJwtForApi(getToken);
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  }, [getToken, isSignedIn]);

  return (
    <QuestionImageDropzone
      endpoint="questionImage"
      headers={headers}
      disabled={!isSignedIn}
      className={cn(
        "rounded-xl border-2 border-dashed border-border/80 bg-gradient-to-b from-muted/40 to-muted/10",
        "hover:border-primary/45 hover:from-primary/5 hover:to-muted/20 transition-all duration-200",
        "focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/50",
        compact ? "min-h-[104px] px-3 py-2" : "min-h-[148px] px-4 py-3",
        className,
      )}
      config={{
        cn: (a, b) => cn(a, b),
        mode: "auto",
      }}
      content={{
        uploadIcon: () => (
          <div className="rounded-full bg-primary/15 p-2 text-primary">
            <LuCloudUpload size={compact ? 20 : 24} strokeWidth={2} />
          </div>
        ),
        label: () => (
          <span className="text-sm font-medium text-foreground">
            {!isSignedIn ? "Sign in to upload" : label}
          </span>
        ),
        allowedContent: () => (
          <span className="text-[11px] text-muted-foreground">
            PNG, JPEG, WebP, GIF · up to 8&nbsp;MB
          </span>
        ),
      }}
      onClientUploadComplete={(res) => {
        const url = pickPublicUrl(res[0]);
        if (url) {
          onUploaded(url);
          toast.success("Image uploaded");
        }
      }}
      onUploadError={(e) => {
        toast.error(e.message || "Upload failed");
      }}
    />
  );
}

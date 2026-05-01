// Admin question image upload via UploadThing (stores files on UT CDN; URLs saved in question JSON → Supabase).
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { generateReactHelpers } from "@uploadthing/react";
import { LuCloudUpload } from "react-icons/lu";
import type { AppFileRouter } from "@/server/uploadthingRouter";
import { getClerkJwtForApi } from "@/lib/getClerkApiJwt";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const { useUploadThing } = generateReactHelpers<AppFileRouter>({
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    if (!isSignedIn) return {};
    const t = await getClerkJwtForApi(getToken);
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  }, [getToken, isSignedIn]);

  const { startUpload, isUploading } = useUploadThing("questionImage", {
    headers,
    uploadProgressGranularity: "fine",
    onUploadProgress: setProgress,
    onClientUploadComplete: (res) => {
      setProgress(0);
      const url = pickPublicUrl(res[0]);
      if (url) {
        onUploaded(url);
        toast.success("Image uploaded");
      }
    },
    onUploadError: (e) => {
      setProgress(0);
      toast.error(e.message || "Upload failed");
    },
  });

  const disabled = !isSignedIn || isUploading;

  const uploadFiles = useCallback(
    (files: FileList | File[]) => {
      const selected = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (!selected.length || disabled) return;
      void startUpload(selected);
    },
    [disabled, startUpload],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 text-center",
        "rounded-xl border-2 border-dashed border-border/80 bg-gradient-to-b from-muted/40 to-muted/10",
        "hover:border-primary/45 hover:from-primary/5 hover:to-muted/20 transition-all duration-200",
        "focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/50",
        dragActive && "border-primary/60 from-primary/10",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        compact ? "min-h-[104px] px-3 py-2" : "min-h-[148px] px-4 py-3",
        className,
      )}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        uploadFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.currentTarget.files) uploadFiles(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      <div className="rounded-full bg-primary/15 p-2 text-primary">
        <LuCloudUpload size={compact ? 20 : 24} strokeWidth={2} />
      </div>
      <span className="text-sm font-medium text-foreground">
        {!isSignedIn ? "Sign in to upload" : isUploading ? `Uploading ${progress}%` : label}
      </span>
      <span className="text-[11px] text-muted-foreground">PNG, JPEG, WebP, GIF · up to 8 MB</span>
      {isUploading && (
        <div className="absolute bottom-2 left-3 right-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

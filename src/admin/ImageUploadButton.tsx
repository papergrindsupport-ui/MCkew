// Small "Upload image" button used in the admin question editor.
// Calls the backend API which stores the file in the `question-images`
// bucket and returns a public URL.
import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/integrations/account/useApi";

export function ImageUploadButton({
  onUploaded,
  label = "Upload",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const api = useApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const { data } = await api.uploadQuestionImage(file);
      onUploaded(data.url);
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "error" in e
          ? String((e as { error: string }).error)
          : "Upload failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
        <span className="ml-1">{busy ? "Uploading…" : label}</span>
      </Button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}

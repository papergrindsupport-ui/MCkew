import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ExamPreviewPage } from "@/components/builder/ExamPreviewPage";

export const Route = createFileRoute("/smart-solve-bio_/exam-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : null,
    share: typeof search.share === "string" ? search.share : null,
  }),
  head: () => ({
    meta: [
      { title: "Exam preview — Smart Solve Biology" },
      { name: "description", content: "Live preview of your custom Biology exam." },
    ],
  }),
  component: BioExamPreview,
});

function BioExamPreview() {
  const { id, share } = useSearch({ from: "/smart-solve-bio_/exam-preview" });
  return <ExamPreviewPage previewId={id} shareId={share} subject="bio" />;
}

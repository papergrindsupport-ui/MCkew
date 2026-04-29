import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ExamPreviewPage } from "@/components/builder/ExamPreviewPage";

export const Route = createFileRoute("/smart-solve-phys_/exam-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : null,
    share: typeof search.share === "string" ? search.share : null,
  }),
  head: () => ({
    meta: [
      { title: "Exam preview — Smart Solve Physics" },
      { name: "description", content: "Live preview of your custom Physics exam." },
    ],
  }),
  component: PhysExamPreview,
});

function PhysExamPreview() {
  const { id, share } = useSearch({ from: "/smart-solve-phys_/exam-preview" });
  return <ExamPreviewPage previewId={id} shareId={share} subject="phys" />;
}

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ExamPreviewPage } from "@/components/builder/ExamPreviewPage";

export const Route = createFileRoute("/smart-solve-chem_/exam-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : null,
    share: typeof search.share === "string" ? search.share : null,
  }),
  head: () => ({
    meta: [
      { title: "Exam preview — Smart Solve Chemistry" },
      { name: "description", content: "Live preview of your custom Chemistry exam." },
    ],
  }),
  component: ChemExamPreview,
});

function ChemExamPreview() {
  const { id, share } = useSearch({ from: "/smart-solve-chem_/exam-preview" });
  return <ExamPreviewPage previewId={id} shareId={share} subject="chem" />;
}

import { createFileRoute } from "@tanstack/react-router";
import { SmartSolveSubjectPage } from "@/components/smart-solve/SmartSolveSubjectPage";

export const Route = createFileRoute("/smart-solve-all")({
  head: () => ({
    meta: [
      { title: "Smart Solve All — Bio, Chem & Physics MCQs" },
      {
        name: "description",
        content:
          "Every MCQ across Biology, Chemistry & Physics with cross-subject filters and three solving modes.",
      },
      { property: "og:title", content: "Smart Solve All Subjects" },
      { property: "og:description", content: "Every MCQ across all three sciences." },
    ],
  }),
  component: () => <SmartSolveSubjectPage title="All Questions" />,
});

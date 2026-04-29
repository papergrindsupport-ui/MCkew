import { createFileRoute } from "@tanstack/react-router";
import { SmartSolveSubjectPage } from "@/components/smart-solve/SmartSolveSubjectPage";

export const Route = createFileRoute("/smart-solve-phys")({
  head: () => ({
    meta: [
      { title: "Smart Solve Physics — Practice MCQs" },
      {
        name: "description",
        content:
          "All Physics MCQ questions in one place with smart filters and three solving modes.",
      },
      { property: "og:title", content: "Smart Solve Physics" },
      { property: "og:description", content: "Practice every Physics MCQ in one place." },
    ],
  }),
  component: () => <SmartSolveSubjectPage subject="phys" title="Physics Questions" />,
});

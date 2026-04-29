import { createFileRoute } from "@tanstack/react-router";
import { SmartSolveSubjectPage } from "@/components/smart-solve/SmartSolveSubjectPage";

export const Route = createFileRoute("/smart-solve-chem")({
  head: () => ({
    meta: [
      { title: "Smart Solve Chemistry — Practice MCQs" },
      {
        name: "description",
        content:
          "All Chemistry MCQ questions in one place with smart filters and three solving modes.",
      },
      { property: "og:title", content: "Smart Solve Chemistry" },
      { property: "og:description", content: "Practice every Chemistry MCQ in one place." },
    ],
  }),
  component: () => <SmartSolveSubjectPage subject="chem" title="Chemistry Questions" />,
});

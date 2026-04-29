import { createFileRoute } from "@tanstack/react-router";
import { SmartSolveSubjectPage } from "@/components/smart-solve/SmartSolveSubjectPage";

export const Route = createFileRoute("/smart-solve-bio")({
  head: () => ({
    meta: [
      { title: "Smart Solve Biology — Practice MCQs" },
      {
        name: "description",
        content:
          "All Biology MCQ questions in one place with smart filters and three solving modes.",
      },
      { property: "og:title", content: "Smart Solve Biology" },
      { property: "og:description", content: "Practice every Biology MCQ in one place." },
    ],
  }),
  component: () => <SmartSolveSubjectPage subject="bio" title="Biology Questions" />,
});

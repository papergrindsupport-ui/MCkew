export type ExamPreviewShareAudience = "student" | "editor";
export type ExamPreviewShareSubject = "bio" | "chem" | "phys" | "all";

export type ExamPreviewShare = {
  id: string;
  audience: ExamPreviewShareAudience;
  readOnly: boolean;
  subject: ExamPreviewShareSubject;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export async function createExamPreviewShare(input: {
  audience: ExamPreviewShareAudience;
  readOnly?: boolean;
  subject: ExamPreviewShareSubject;
  data: Record<string, unknown>;
}): Promise<{ id: string }> {
  const res = await fetch("/api/exam-preview-shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  const jsonBody = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(jsonBody?.error || `Share create failed (${res.status})`);
  }
  return { id: String(jsonBody.id) };
}

export async function fetchExamPreviewShare(id: string): Promise<ExamPreviewShare> {
  const res = await fetch(`/api/exam-preview-shares/${encodeURIComponent(id)}`);
  const text = await res.text();
  const jsonBody = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(jsonBody?.error || `Share fetch failed (${res.status})`);
  }
  return jsonBody.share as ExamPreviewShare;
}


// Image OCR helper using tesseract.js (fully client-side).
//
// Lazy-imports tesseract so the ~2MB worker bundle isn't pulled in until the
// user actually uploads/drops an image. Reuses a single worker across calls.

import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const w = await createWorker("eng");
      return w;
    })();
  }
  return workerPromise;
}

/** Run OCR on an image File/Blob and return cleaned-up text. */
export async function ocrImage(file: File | Blob): Promise<string> {
  const worker = await getWorker();
  const url = URL.createObjectURL(file);
  try {
    const { data } = await worker.recognize(url);
    return cleanOcrText(data.text || "");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cleanOcrText(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(/[|_~`]+/g, " ")
    .trim();
}

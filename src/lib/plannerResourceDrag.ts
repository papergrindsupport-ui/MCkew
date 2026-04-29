import type { DragEvent } from "react";
import { createTask, type Task } from "@/lib/plannerTasksStore";

export const PLANNER_RESOURCE_MIME = "application/x-smart-solving-planner-resource";

export type PlannerResourceKind = "paper" | "lesson";

export type PlannerResourcePayload = {
  kind: PlannerResourceKind;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  link?: string;
};

export function setPlannerResourceDrag(event: DragEvent<Element>, payload: PlannerResourcePayload) {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(PLANNER_RESOURCE_MIME, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", payload.title);
}

export function hasPlannerResourceDrag(event: DragEvent<Element>) {
  return Array.from(event.dataTransfer.types).includes(PLANNER_RESOURCE_MIME);
}

export function readPlannerResourceDrag(event: DragEvent<Element>): PlannerResourcePayload | null {
  const raw = event.dataTransfer.getData(PLANNER_RESOURCE_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlannerResourcePayload;
    if (!parsed.title?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createTaskFromPlannerResource(
  resource: PlannerResourcePayload,
  options: {
    columnId?: string;
    dueDate?: string;
    startDate?: string;
    endDate?: string;
  } = {},
): Task {
  return createTask({
    columnId: options.columnId,
    title: resource.title,
    description: [resource.subtitle, resource.description].filter(Boolean).join("\n\n"),
    dueDate: options.dueDate,
    startDate: options.startDate,
    endDate: options.endDate,
    tags: [resource.kind, ...(resource.tags ?? [])].slice(0, 8),
    link: resource.link,
  });
}

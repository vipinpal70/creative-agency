// Client-safe task status constants — no mongoose imports here, so this can
// be shared between the model, API routes, and browser components.

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TASK_STATUSES: TaskStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

// Statuses that existed before the board was reduced to three columns.
// Kept in the schema enum so legacy documents stay readable; mapped to the
// new set whenever a task is serialized for the client.
export const LEGACY_TASK_STATUSES = [
  "OPENED",
  "ON_HOLD",
  "COMPLETED",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export const TASK_STATUS_ENUM: string[] = [...TASK_STATUSES, ...LEGACY_TASK_STATUSES];

export function normalizeTaskStatus(status: string | undefined): TaskStatus {
  switch (status) {
    case "IN_PROGRESS":
    case "ON_HOLD":
    case "INTERNAL_REVIEW":
    case "CLIENT_REVIEW":
      return "IN_PROGRESS";
    case "COMPLETED":
    case "APPROVED":
    case "CLOSED":
      return "CLOSED";
    default:
      return "OPEN";
  }
}

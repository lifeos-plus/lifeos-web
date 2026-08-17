import type { TaskWithSubtasks } from "@/services/api";

/**
 * Subtask statuses that allow a parent task to be marked as done.
 * Mirrors the backend rule in lifeos-cli task_support.py.
 */
export const PARENT_COMPLETION_ALLOWED_SUBTASK_STATUSES = new Set([
  "done",
  "cancelled",
  "paused",
]);

/** Exact backend detail returned when a parent task has open direct subtasks. */
export const PARENT_COMPLETION_BLOCKED_ERROR =
  "Task cannot be completed until all direct subtasks are done, cancelled, or paused";

export function isClosedSubtaskStatus(status: string): boolean {
  return PARENT_COMPLETION_ALLOWED_SUBTASK_STATUSES.has(status);
}

export function hasBlockingDirectSubtasks(
  task: Pick<TaskWithSubtasks, "subtasks">,
): boolean {
  return (task.subtasks ?? []).some(
    (subtask) => !isClosedSubtaskStatus(subtask.status),
  );
}

/** Collect every open descendant (not done/cancelled/paused) of a task tree. */
export function collectOpenSubtasks(
  task: Pick<TaskWithSubtasks, "subtasks">,
): TaskWithSubtasks[] {
  const open: TaskWithSubtasks[] = [];
  const visit = (node: TaskWithSubtasks): void => {
    for (const child of node.subtasks ?? []) {
      if (!isClosedSubtaskStatus(child.status)) {
        open.push(child);
      }
      visit(child);
    }
  };
  visit(task as TaskWithSubtasks);
  return open;
}

export function isParentCompletionBlockedError(error: Error): boolean {
  return error.message === PARENT_COMPLETION_BLOCKED_ERROR;
}

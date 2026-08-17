import { describe, expect, it } from "vitest";
import type { TaskWithSubtasks } from "@/services/api";
import type { UUID } from "@/types/primitive";
import {
  collectOpenSubtasks,
  hasBlockingDirectSubtasks,
  isParentCompletionBlockedError,
  PARENT_COMPLETION_BLOCKED_ERROR,
} from "@/utils/taskStatus";

const buildTask = (
  subtaskStatuses: string[],
): TaskWithSubtasks =>
  ({
    id: "task-1" as UUID,
    vision_id: "vision-1" as UUID,
    parent_task_id: null,
    content: "Parent task",
    status: "todo",
    priority: 1,
    display_order: 0,
    actual_effort_self: 0,
    actual_effort_total: 0,
    notes_count: 0,
    timelogs_count: 0,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    subtasks: subtaskStatuses.map((status, index) => ({
      id: `subtask-${index}` as UUID,
      vision_id: "vision-1" as UUID,
      parent_task_id: "task-1" as UUID,
      content: `Subtask ${index}`,
      status,
      priority: 1,
      display_order: index,
      actual_effort_self: 0,
      actual_effort_total: 0,
      notes_count: 0,
      timelogs_count: 0,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      subtasks: [],
      completion_percentage: 0,
      depth: 1,
    })),
    completion_percentage: 0,
    depth: 0,
  }) as TaskWithSubtasks;

describe("hasBlockingDirectSubtasks", () => {
  it("returns false for a task without subtasks", () => {
    expect(hasBlockingDirectSubtasks(buildTask([]))).toBe(false);
  });

  it("returns false when all direct subtasks are done, cancelled, or paused", () => {
    expect(
      hasBlockingDirectSubtasks(buildTask(["done", "cancelled", "paused"])),
    ).toBe(false);
  });

  it("returns true when a direct subtask is still open", () => {
    expect(hasBlockingDirectSubtasks(buildTask(["todo", "done"]))).toBe(true);
    expect(hasBlockingDirectSubtasks(buildTask(["in_progress"]))).toBe(true);
  });
});

describe("collectOpenSubtasks", () => {
  it("collects open descendants recursively and skips closed ones", () => {
    const task = buildTask(["todo", "cancelled"]);
    (task.subtasks[0].subtasks as TaskWithSubtasks[]).push({
      ...task.subtasks[1],
      id: "grandchild-1" as UUID,
      status: "in_progress",
      parent_task_id: task.subtasks[0].id,
      content: "Open grandchild",
      depth: 2,
    });

    const open = collectOpenSubtasks(task);
    expect(open.map((subtask) => subtask.content)).toEqual([
      "Subtask 0",
      "Open grandchild",
    ]);
  });
});

describe("isParentCompletionBlockedError", () => {
  it("matches the exact backend message", () => {
    expect(
      isParentCompletionBlockedError(
        new Error(PARENT_COMPLETION_BLOCKED_ERROR),
      ),
    ).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isParentCompletionBlockedError(new Error("Something else"))).toBe(
      false,
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import DraggableTaskList from "@/components/DraggableTaskList";
import type { TaskWithSubtasks, Vision } from "@/services/api";
import type { UUID } from "@/types/primitive";
import {
  renderWithProviders,
  setupTranslationMock,
} from "@test/utils";

setupTranslationMock({
  translator: (key, options) => {
    const params = options as Record<string, unknown> | undefined;
    if (key === "draggableTaskList.tooltip.parent" && params?.parent) {
      return `parent=${params.parent}`;
    }
    if (key === "draggableTaskList.tooltip.vision" && params?.vision) {
      return `vision=${params.vision}`;
    }
    if (key === "draggableTaskList.tooltip.title" && params?.name) {
      return `title=${params.name}`;
    }
    return key;
  },
});

const buildTask = (overrides: Partial<TaskWithSubtasks>): TaskWithSubtasks => ({
  id: "task-child" as UUID,
  vision_id: "vision-1" as UUID,
  parent_task_id: "task-parent" as UUID,
  content: "Daily review",
  status: "todo",
  priority: 1,
  display_order: 0,
  planning_cycle_type: "day",
  planning_cycle_start_date: "2026-08-10",
  actual_effort_self: 0,
  actual_effort_total: 0,
  notes_count: 0,
  timelogs_count: 0,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  subtasks: [],
  completion_percentage: 0,
  depth: 0,
  ...overrides,
});

describe("DraggableTaskList tooltip", () => {
  it("resolves parent task name from the task lookup for orphaned tasks", async () => {
    const task = buildTask({});
    const taskLookup = new Map([
      [
        "task-parent",
        {
          id: "task-parent" as UUID,
          content: "Weekly parent",
          status: "in_progress",
          priority: 2,
        },
      ],
    ]);

    renderWithProviders(
      <DraggableTaskList
        tasks={[task]}
        taskLookup={taskLookup}
        onEditTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onStatusUpdate={vi.fn()}
        onAddSubtask={vi.fn()}
        onViewTimeRecords={vi.fn()}
        onCreateNote={vi.fn()}
        onViewNotes={vi.fn()}
        onCreateTimeRecord={vi.fn()}
        isPlanningPage
      />,
    );

    const heading = screen.getByText("Daily review");
    fireEvent.mouseEnter(heading);

    await waitFor(() => {
      expect(screen.getByText("parent=Weekly parent")).toBeInTheDocument();
    });
  });

  it("resolves vision name from the visions prop", async () => {
    const task = buildTask({});

    renderWithProviders(
      <DraggableTaskList
        tasks={[task]}
        visions={[{ id: "vision-1" as UUID, name: "My Vision" } as Vision]}
        showVisionInfo
        onEditTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onStatusUpdate={vi.fn()}
        onAddSubtask={vi.fn()}
        onViewTimeRecords={vi.fn()}
        onCreateNote={vi.fn()}
        onViewNotes={vi.fn()}
        onCreateTimeRecord={vi.fn()}
      />,
    );

    const heading = screen.getByText("Daily review");
    fireEvent.mouseEnter(heading);

    await waitFor(() => {
      expect(screen.getByText("vision=My Vision")).toBeInTheDocument();
    });
  });
});

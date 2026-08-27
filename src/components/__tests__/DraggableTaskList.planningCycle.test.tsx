import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import DraggableTaskList from "@/components/DraggableTaskList";
import { MayanCalendarAdapter } from "@/utils/calendar";
import type { TaskWithSubtasks } from "@/services/api";
import type { UUID } from "@/types/primitive";
import {
  renderWithProviders,
  setupTranslationMock,
} from "@test/utils";

setupTranslationMock({
  translator: (key, options) => {
    const params = options as Record<string, unknown> | undefined;
    if (key === "draggableTaskList.planningCycle.from" && params?.date) {
      return String(params.date);
    }
    if (key === "draggableTaskList.planningCycle.within") {
      return "";
    }
    return key;
  },
});

vi.mock("@/hooks/useCalendarAdapter", () => ({
  useCalendarAdapter: () => ({
    adapter: new MayanCalendarAdapter(1, 1984, "10-05"),
    calendarSystem: "mayan_13_moon",
    firstDayOfWeek: 1,
    sevenYearAnchorYear: 1984,
    mayanNewYearStart: "10-05",
    loading: false,
  }),
}));

const buildTask = (overrides: Partial<TaskWithSubtasks>): TaskWithSubtasks => ({
  id: "task-1" as UUID,
  vision_id: null,
  parent_task_id: null,
  content: "Seven-year task",
  status: "todo",
  priority: 1,
  display_order: 0,
  planning_cycle_type: "7years",
  planning_cycle_start_date: "2026-07-26",
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

const renderList = (isPlanningPage = false) =>
  renderWithProviders(
    <DraggableTaskList
      tasks={[buildTask({})]}
      onEditTask={vi.fn()}
      onDeleteTask={vi.fn()}
      onStatusUpdate={vi.fn()}
      onAddSubtask={vi.fn()}
      onViewTimeRecords={vi.fn()}
      onCreateNote={vi.fn()}
      onViewNotes={vi.fn()}
      onCreateTimeRecord={vi.fn()}
      isPlanningPage={isPlanningPage}
    />,
  );

describe("DraggableTaskList planning cycle label", () => {
  it("shows the configured seven-year period start instead of the stored date", () => {
    renderList();

    expect(screen.getByText(/2019-10-05/)).toBeTruthy();
    expect(screen.queryByText(/2026-07-26/)).toBeNull();
  });

  it("keeps the cycle label visible in the planning page", () => {
    renderList(true);

    expect(screen.getByText(/2019-10-05/)).toBeTruthy();
  });
});

import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeEntriesTable from "@/components/TimeEntriesTable";
import type { ProcessedEntry } from "@/utils/datetime";
import type { UUID } from "@/types/primitive";
import { renderWithProviders } from "@test/utils";

const buildEntry = (overrides: Partial<ProcessedEntry> = {}): ProcessedEntry => ({
  id: "entry-1" as UUID,
  title: "Deep work",
  start_time: "2026-08-10T02:00:00.000Z",
  end_time: "2026-08-10T03:00:00.000Z",
  area_id: null,
  tracking_method: "manual",
  created_at: "2026-08-10T02:00:00.000Z",
  updated_at: "2026-08-10T02:00:00.000Z",
  people: [],
  tags: [],
  extra_data: null,
  task: {
    id: "task-1" as UUID,
    vision_id: "vision-1" as UUID,
    parent_task_id: null,
    content: "Focus task",
    status: "in_progress",
  },
  linked_notes: [],
  linked_notes_count: 0,
  isPlaceholder: false,
  ...overrides,
});

const renderTable = (
  overrides?: Partial<React.ComponentProps<typeof TimeEntriesTable>>,
) => {
  const defaultProps: React.ComponentProps<typeof TimeEntriesTable> = {
    entries: [buildEntry()],
    isLoading: false,
    isSelectMode: false,
    selectedEntryIds: new Set<UUID>(),
    onSelectChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPlaceholderClick: vi.fn(),
    onEntrySaved: vi.fn(),
    sortOrder: "asc",
    onSortChange: vi.fn(),
    selectedDate: new Date("2026-08-10T00:00:00.000Z"),
    timezone: "UTC",
    queryMode: "single",
    areaMap: new Map(),
    preloadedTasks: [],
    selectedAreaId: null,
    onAreaChange: vi.fn(),
    ...overrides,
  };
  return renderWithProviders(<TimeEntriesTable {...defaultProps} />);
};

describe("TimeEntriesTable tooltip", () => {
  it("renders linked task, status and vision from entry.task with lookups", async () => {
    renderTable({
      tooltipLookups: {
        visionMap: new Map([
          ["vision-1", { name: "Deep Vision" }],
        ]),
      },
    });

    const descriptionCell = screen
      .getByText("Deep work")
      .closest("td") as HTMLElement;
    fireEvent.mouseEnter(descriptionCell);

    await waitFor(() => {
      expect(
        screen.getByText(/timeLog\.tooltip\.timeRange/),
      ).toBeInTheDocument();
    });
    // 表格行与 tips 都会展示任务内容，断言至少两处
    expect(screen.getAllByText("Focus task").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("Deep Vision")).toBeInTheDocument();
  });
});

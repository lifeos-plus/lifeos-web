import { describe, expect, it } from "vitest";
import type { UUID } from "@/types/primitive";
import {
  buildTooltipLookups,
  resolveTaskTooltipData,
  toTooltipLookupEntry,
  type TaskTooltipSource,
} from "@/components/tooltips/tooltipData";

const asUuid = (value: string) => value as UUID;

describe("resolveTaskTooltipData", () => {
  it("returns null for missing sources", () => {
    expect(resolveTaskTooltipData(null)).toBeNull();
    expect(resolveTaskTooltipData(undefined)).toBeNull();
  });

  it("keeps explicit summary fields and falls back to none for missing", () => {
    const data = resolveTaskTooltipData({
      id: asUuid("task-1"),
      content: "Deep work",
      status: "in_progress",
    });

    expect(data).toMatchObject({
      content: "Deep work",
      status: "in_progress",
      priority: null,
      visionName: null,
      parentContent: null,
    });
  });

  it("resolves vision name from the source summary first", () => {
    const data = resolveTaskTooltipData(
      {
        id: asUuid("task-1"),
        vision_id: asUuid("vision-1"),
        vision_summary: { name: "Summary Vision" },
      },
      {
        visionMap: new Map([[asUuid("vision-1"), { name: "Lookup Vision" }]]),
      },
    );

    expect(data?.visionName).toBe("Summary Vision");
  });

  it("resolves vision name from the vision lookup by id", () => {
    const data = resolveTaskTooltipData(
      { id: asUuid("task-1"), vision_id: asUuid("vision-1") },
      {
        visionMap: new Map([[asUuid("vision-1"), { name: "Lookup Vision" }]]),
      },
    );

    expect(data?.visionName).toBe("Lookup Vision");
  });

  it("resolves parent content from the task lookup by parent id", () => {
    const data = resolveTaskTooltipData(
      {
        id: asUuid("task-child"),
        parent_task_id: asUuid("task-parent"),
      },
      {
        taskMap: new Map([
          [asUuid("task-parent"), { id: asUuid("task-parent"), content: "Parent" }],
        ]),
      },
    );

    expect(data?.parentContent).toBe("Parent");
  });

  it("fills fields missing on a summary from the fuller task record", () => {
    const summary: TaskTooltipSource = {
      id: asUuid("task-1"),
      content: "Summary",
      status: "todo",
    };
    const fullTask = {
      id: asUuid("task-1"),
      content: "Full",
      priority: 3,
      planning_cycle_type: "day",
      planning_cycle_start_date: "2026-08-10",
      actual_effort_total: 120,
      created_at: "2026-08-01T00:00:00Z",
    };

    const data = resolveTaskTooltipData(summary, {
      taskMap: new Map([[asUuid("task-1"), toTooltipLookupEntry(fullTask)]]),
    });

    expect(data).toMatchObject({
      content: "Summary",
      status: "todo",
      priority: 3,
      planningCycleType: "day",
      planningCycleStartDate: "2026-08-10",
      actualEffortTotal: 120,
      createdAt: "2026-08-01T00:00:00Z",
    });
  });
});

describe("buildTooltipLookups", () => {
  it("flattens nested subtasks and merges task overrides", () => {
    const lookups = buildTooltipLookups({
      visions: [{ id: asUuid("vision-1"), name: "Vision A" }],
      tasks: [
        {
          id: asUuid("root"),
          content: "Root",
          subtasks: [
            { id: asUuid("child"), content: "Child" },
            {
              id: asUuid("grandchild"),
              content: "Grandchild",
              subtasks: [],
            },
          ],
        },
      ],
      taskOverrides: new Map([
        [asUuid("root"), { id: asUuid("root"), content: "Root Override" }],
      ]),
    });

    expect(lookups.visionMap?.get(asUuid("vision-1"))).toEqual({
      name: "Vision A",
    });
    expect(lookups.taskMap?.get(asUuid("child"))?.content).toBe("Child");
    expect(lookups.taskMap?.get(asUuid("grandchild"))?.content).toBe(
      "Grandchild",
    );
    expect(lookups.taskMap?.get(asUuid("root"))?.content).toBe(
      "Root Override",
    );
  });
});

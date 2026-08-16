import { describe, expect, it } from "vitest";

import {
  buildDraftTimelog,
  buildProcessedEntry,
} from "@/features/timeLog/bulkImport/draftBuilders";
import type { TimelogTaskSummary } from "@/services/api/timelogs";
import type { PersonSummary } from "@/services/api/types/common";

const row = {
  id: "row-1",
  description: "Focus",
  date: "2026-08-15",
  startTime: "09:00",
  endDate: "2026-08-15",
  endTime: "10:00",
  areaId: "area-1",
  personIds: ["p1", "p2"],
  taskId: "task-1",
  energyLevel: null,
  sourceLineNumber: 1,
  errors: [],
} as never;

const personLookup = new Map<string, PersonSummary>([
  ["p1", { id: "p1", name: "Alice", display_name: "Alice" }],
]);

const taskLookup = new Map<string, TimelogTaskSummary>([
  [
    "task-1",
    {
      id: "task-1",
      content: "Task A",
      vision_id: null,
    } as unknown as TimelogTaskSummary,
  ],
]);

describe("bulk import builders", () => {
  it("builds a draft timelog with person ids mapped to names", () => {
    const draft = buildDraftTimelog(row, "UTC", taskLookup, personLookup);

    expect(draft.person).toEqual([
      { id: "p1", name: "Alice" },
      { id: "p2", name: "" },
    ]);
    expect(draft.title).toBe("Focus");
    expect(draft.task?.id).toBe("task-1");
  });

  it("builds a processed entry for preview", () => {
    const processed = buildProcessedEntry(row, "UTC", taskLookup, personLookup);

    expect(processed.person).toEqual([
      { id: "p1", name: "Alice" },
      { id: "p2", name: "" },
    ]);
    expect(processed.validationResult?.isValid).toBe(true);
  });
});

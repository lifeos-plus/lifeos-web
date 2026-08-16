import { describe, expect, it } from "vitest";

import type { Timelog } from "@/services/api";
import { processTimeEntries } from "@/utils/datetime";

function entry(
  id: string,
  startTime: string,
  endTime: string,
): Timelog {
  return {
    id,
    title: `entry-${id}`,
    start_time: startTime,
    end_time: endTime,
  } as unknown as Timelog;
}

const selectedDate = new Date("2024-01-15T00:00:00.000Z");
const timezone = "UTC";

describe("processTimeEntries", () => {
  it("flags entries with a negative duration", () => {
    const bad = entry("1", "2024-01-15T10:00:00.000Z", "2024-01-15T09:00:00.000Z");
    const processed = processTimeEntries([bad], selectedDate, timezone);
    const byId = new Map(processed.map((item) => [item.id, item]));

    expect(byId.get("1")?.validationResult?.hasNegativeDuration).toBe(true);
    expect(byId.get("1")?.validationResult?.isValid).toBe(false);
  });

  it("treats equal start and end times as a valid zero-duration marker", () => {
    const marker = entry("1", "2024-01-15T10:00:00.000Z", "2024-01-15T10:00:00.000Z");
    const processed = processTimeEntries([marker], selectedDate, timezone);
    const byId = new Map(processed.map((item) => [item.id, item]));

    expect(byId.get("1")?.validationResult?.hasNegativeDuration).toBe(false);
  });

  it("flags overlapping entries but not endpoint touches", () => {
    const overlappingA = entry("1", "2024-01-15T09:00:00.000Z", "2024-01-15T10:00:00.000Z");
    const overlappingB = entry("2", "2024-01-15T09:30:00.000Z", "2024-01-15T10:30:00.000Z");
    const touchingA = entry("3", "2024-01-15T11:00:00.000Z", "2024-01-15T12:00:00.000Z");
    const touchingB = entry("4", "2024-01-15T12:00:00.000Z", "2024-01-15T13:00:00.000Z");

    const processed = processTimeEntries(
      [overlappingA, overlappingB, touchingA, touchingB],
      selectedDate,
      timezone,
    );

    const byId = new Map(processed.map((item) => [item.id, item]));
    expect(byId.get("1")?.validationResult?.hasOverlaps).toBe(true);
    expect(byId.get("2")?.validationResult?.hasOverlaps).toBe(true);
    expect(byId.get("3")?.validationResult?.hasOverlaps).toBe(false);
    expect(byId.get("4")?.validationResult?.hasOverlaps).toBe(false);
  });

  it("creates placeholders for the gaps around and between entries", () => {
    const first = entry("1", "2024-01-15T09:00:00.000Z", "2024-01-15T10:00:00.000Z");
    const second = entry("2", "2024-01-15T12:00:00.000Z", "2024-01-15T13:00:00.000Z");

    const processed = processTimeEntries([first, second], selectedDate, timezone);
    const placeholders = processed.filter((item) => item.isPlaceholder);

    expect(placeholders).toHaveLength(3);
    expect(placeholders.every((item) => item.id.startsWith("placeholder_"))).toBe(
      true,
    );
  });

  it("creates a single full-day placeholder when there are no entries", () => {
    const processed = processTimeEntries([], selectedDate, timezone);

    expect(processed).toHaveLength(1);
    expect(processed[0].isPlaceholder).toBe(true);
    expect(processed[0].start_time).toBe("2024-01-15T00:00:00.000Z");
    expect(processed[0].end_time).toBe("2024-01-15T23:59:59.999Z");
  });

  it("sorts the merged output by start time", () => {
    const late = entry("1", "2024-01-15T13:00:00.000Z", "2024-01-15T14:00:00.000Z");
    const early = entry("2", "2024-01-15T08:00:00.000Z", "2024-01-15T09:00:00.000Z");

    const processed = processTimeEntries([late, early], selectedDate, timezone);
    const realEntries = processed.filter((item) => !item.isPlaceholder);
    const starts = realEntries.map((item) => item.start_time);

    expect(starts).toEqual([...starts].sort());
    expect(realEntries[0].id).toBe("2");
  });

  it("skips entries without time bounds in validation", () => {
    const incomplete = {
      id: "1",
      title: "no-times",
    } as unknown as Timelog;

    const processed = processTimeEntries([incomplete], selectedDate, timezone);
    const byId = new Map(processed.map((item) => [item.id, item]));

    expect(byId.get("1")?.validationResult?.hasNegativeDuration).toBe(false);
    expect(byId.get("1")?.validationResult?.isValid).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  ALL_FILTER_VALUE,
  buildAreaOptionCounts,
  buildCountedFilterOptions,
} from "@/utils/filterOptionCounts";
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";

describe("buildCountedFilterOptions", () => {
  const baseOptions = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" },
  ];

  it("suffixes each label with the count and sorts by count descending", () => {
    const result = buildCountedFilterOptions(baseOptions, {
      active: 5,
      paused: 2,
      completed: 7,
    });

    expect(result).toEqual([
      { value: "completed", label: "Completed (7)" },
      { value: "active", label: "Active (5)" },
      { value: "paused", label: "Paused (2)" },
    ]);
  });

  it("keeps original order for equal counts (stable sort)", () => {
    const result = buildCountedFilterOptions(baseOptions, {
      active: 3,
      paused: 3,
      completed: 1,
    });

    expect(result.map((o) => o.value)).toEqual(["active", "paused", "completed"]);
  });

  it("counts missing values as zero", () => {
    const result = buildCountedFilterOptions(baseOptions, { active: 1 });

    expect(result).toEqual([
      { value: "active", label: "Active (1)" },
      { value: "paused", label: "Paused (0)" },
      { value: "completed", label: "Completed (0)" },
    ]);
  });

  it("prepends an all option with the total count when requested", () => {
    const result = buildCountedFilterOptions(baseOptions, {
      active: 2,
      paused: 1,
      completed: 3,
    }, { allLabel: "All", totalCount: 6 });

    expect(result[0]).toEqual({
      value: ALL_FILTER_VALUE,
      label: "All (6)",
    });
    expect(result).toHaveLength(4);
  });

  it("accepts a Map as counts input", () => {
    const counts = new Map<string, number>([
      ["active", 4],
      ["completed", 1],
    ]);
    const result = buildCountedFilterOptions(baseOptions, counts);

    expect(result[0]).toEqual({ value: "active", label: "Active (4)" });
  });
});

describe("buildAreaOptionCounts", () => {
  it("counts items per area and keys the all/none ids with the shared special values", () => {
    const items: Array<{ area_id?: string | null }> = [
      { area_id: "area-1" },
      { area_id: "area-1" },
      { area_id: "area-2" },
      { area_id: null },
      {},
    ];

    expect(buildAreaOptionCounts(items, (item) => item.area_id)).toEqual({
      [SelectorSpecialValue.All]: 5,
      "area-1": 2,
      "area-2": 1,
      [SelectorSpecialValue.None]: 2,
    });
  });

  it("returns only the all/none ids for an empty list", () => {
    expect(
      buildAreaOptionCounts<{ area_id: string | null }>([], () => "area-1"),
    ).toEqual({
      [SelectorSpecialValue.All]: 0,
      [SelectorSpecialValue.None]: 0,
    });
  });
});

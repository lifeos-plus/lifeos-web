import { describe, expect, it } from "vitest";

import { toPeriodBoundaries } from "@/features/insights/periodBoundaries";

describe("toPeriodBoundaries", () => {
  it("maps backend periods to renderable boundaries in order", () => {
    expect(
      toPeriodBoundaries([
        { period_start: "2026-06-27", period_end: "2026-07-24" },
        { period_start: "2026-07-26", period_end: "2026-08-22" },
      ]),
    ).toEqual([
      { start: "2026-06-27", end: "2026-07-24" },
      { start: "2026-07-26", end: "2026-08-22" },
    ]);
  });

  it("keeps empty buckets (no data) in the boundary list", () => {
    expect(toPeriodBoundaries([])).toEqual([]);
  });
});

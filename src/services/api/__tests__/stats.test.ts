import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { statsApi } from "@/services/api/stats";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const emptyList = {
  items: [],
  pagination: { page: 1, size: 20, total: 0, pages: 0 },
  meta: {},
};

describe("statsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes every stats call through the registered endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(emptyList), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

    await statsApi.getDailyAreas("2026-01-01", "2026-01-31");
    await statsApi.getLocalDayBreakdown("2026-01-01");
    await statsApi.getAggregatedAreas("month", "2026-01-01", "2026-01-31");
    await statsApi.recomputeDailyAreas("2026-01-01", "2026-01-31");

    const requestedPaths = fetchMock.mock.calls.map(([input]) =>
      String(input).split("?")[0],
    );

    expect(requestedPaths).toEqual([
      localUrl(ENDPOINTS.STATS.DAILY_AREAS),
      localUrl(ENDPOINTS.STATS.DAY_BREAKDOWN),
      localUrl(ENDPOINTS.STATS.AGGREGATED_AREAS),
      localUrl(ENDPOINTS.STATS.RECOMPUTE_DAILY_AREAS),
    ]);
  });
});

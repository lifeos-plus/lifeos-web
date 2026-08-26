import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { useInsightsStatsController } from "@/features/insights/controller/useInsightsStatsController";

const getAggregatedAreasMock = vi.fn();
const getDailyAreasMock = vi.fn();
const recomputeDailyAreasMock = vi.fn();

vi.mock("@/services/api/stats", () => ({
  statsApi: {
    getAggregatedAreas: (...args: unknown[]) => getAggregatedAreasMock(...args),
    getDailyAreas: (...args: unknown[]) => getDailyAreasMock(...args),
    getLocalDayBreakdown: vi.fn(),
    recomputeDailyAreas: (...args: unknown[]) =>
      recomputeDailyAreasMock(...args),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const BASE_PARAMS = {
  ready: true,
  startDate: "2026-06-20",
  endDate: "2026-08-10",
  granularity: "month" as const,
  activeTimezone: "America/Toronto",
  firstDayOfWeek: 1,
  calendarSystem: "mayan_13_moon" as const,
  refreshErrorMessage: "refresh-failed",
};

describe("useInsightsStatsController", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("exposes the backend bucket timeline and rows for aggregated granularities", async () => {
    getAggregatedAreasMock.mockResolvedValue({
      items: [
        {
          granularity: "month",
          period_start: "2026-06-27",
          period_end: "2026-07-24",
          area_id: "area-1",
          minutes: 60,
        },
      ],
      periods: [
        { period_start: "2026-05-30", period_end: "2026-06-26" },
        { period_start: "2026-06-27", period_end: "2026-07-24" },
        { period_start: "2026-07-26", period_end: "2026-08-22" },
      ],
      pagination: { page: 1, size: 1000, total: 1, pages: 1 },
      meta: {
        granularity: "month",
        start: "2026-06-20",
        end: "2026-08-10",
        timezone: "America/Toronto",
        area_ids: null,
        first_day_of_week: 1,
        calendar_system: "mayan_13_moon",
      },
    });

    const { result } = renderHook(
      () => useInsightsStatsController(BASE_PARAMS),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.aggregatedRows).toHaveLength(1);
    });

    // The complete timeline — including the empty bucket with no rows — comes
    // straight from the backend response.
    expect(result.current.aggregatedRows[0]).toMatchObject({
      period_start: "2026-06-27",
      minutes: 60,
    });
    expect(result.current.aggregatedPeriods).toEqual([
      { period_start: "2026-05-30", period_end: "2026-06-26" },
      { period_start: "2026-06-27", period_end: "2026-07-24" },
      { period_start: "2026-07-26", period_end: "2026-08-22" },
    ]);
    expect(getAggregatedAreasMock).toHaveBeenCalledWith(
      "month",
      "2026-06-20",
      "2026-08-10",
      { page: 1, size: 1000 },
    );
  });

  it("fetches every page and merges rows for long timelines", async () => {
    getAggregatedAreasMock
      .mockResolvedValueOnce({
        items: [
          {
            granularity: "month",
            period_start: "2026-06-27",
            period_end: "2026-07-24",
            area_id: "area-1",
            minutes: 60,
          },
        ],
        periods: [{ period_start: "2026-06-27", period_end: "2026-07-24" }],
        pagination: { page: 1, size: 1000, total: 2, pages: 2 },
        meta: {
          granularity: "month",
          start: "2026-06-20",
          end: "2026-08-10",
          timezone: "America/Toronto",
          area_ids: null,
          first_day_of_week: 1,
          calendar_system: "mayan_13_moon",
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            granularity: "month",
            period_start: "2026-07-26",
            period_end: "2026-08-22",
            area_id: "area-2",
            minutes: 30,
          },
        ],
        periods: [],
        pagination: { page: 2, size: 1000, total: 2, pages: 2 },
        meta: {
          granularity: "month",
          start: "2026-06-20",
          end: "2026-08-10",
          timezone: "America/Toronto",
          area_ids: null,
          first_day_of_week: 1,
          calendar_system: "mayan_13_moon",
        },
      });

    const { result } = renderHook(
      () => useInsightsStatsController(BASE_PARAMS),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.aggregatedRows).toHaveLength(2);
    });

    expect(getAggregatedAreasMock).toHaveBeenCalledTimes(2);
    expect(result.current.aggregatedRows.map((row) => row.area_id)).toEqual([
      "area-1",
      "area-2",
    ]);
    expect(result.current.aggregatedPeriods).toEqual([
      { period_start: "2026-06-27", period_end: "2026-07-24" },
    ]);
  });

  it("keeps aggregated buckets empty for day granularity", async () => {
    getDailyAreasMock.mockResolvedValue({ items: [] });

    const { result } = renderHook(
      () =>
        useInsightsStatsController({
          ...BASE_PARAMS,
          granularity: "day",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.dailyStats).toEqual([]);
    });

    expect(result.current.aggregatedRows).toEqual([]);
    expect(result.current.aggregatedPeriods).toEqual([]);
  });
});

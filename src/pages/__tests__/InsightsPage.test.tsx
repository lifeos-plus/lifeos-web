import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import InsightsPage from "@/pages/InsightsPage";
import { MayanCalendarAdapter } from "@/utils/calendar";

const setHeaderMock = vi.fn();
const viewState = {
  viewMode: "minutes" as const,
  setViewMode: vi.fn(),
  viewType: "month" as const,
  handleViewTypeChange: vi.fn(),
  granularity: "month" as const,
  setGranularity: vi.fn(),
  selectedDate: new Date("2026-06-20T00:00:00"),
  setSelectedDate: vi.fn(),
  startDate: "2026-06-20",
  endDate: "2026-08-10",
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  ready: true,
  navigateToPreviousPeriod: vi.fn(),
  navigateToCurrentPeriod: vi.fn(),
  navigateToNextPeriod: vi.fn(),
};
const statsState = {
  dailyStats: [],
  aggregatedRows: [
    {
      granularity: "month",
      period_start: "2026-06-27",
      period_end: "2026-07-24",
      area_id: "area-1",
      minutes: 60,
    },
  ],
  aggregatedPeriods: [
    { period_start: "2026-05-30", period_end: "2026-06-26" },
    { period_start: "2026-06-27", period_end: "2026-07-24" },
    { period_start: "2026-07-26", period_end: "2026-08-22" },
  ],
  isLoading: false,
  displayError: null,
  refreshStats: vi.fn(),
};

const pageData = {
  firstDayOfWeek: 1,
  calendarSystem: "mayan_13_moon" as const,
  activeTimezone: "America/Toronto",
  calendarAdapter: new MayanCalendarAdapter(),
  areas: [],
  areaMap: {},
  areaOrder: [],
  calendarLoading: false,
};

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({ setHeader: setHeaderMock }),
}));

vi.mock("@/hooks/useHoverTooltip", () => ({
  useHoverTooltip: () => ({
    tooltipState: null,
    showTooltip: vi.fn(),
    schedulePositionUpdate: vi.fn(),
    hideTooltip: vi.fn(),
    showTooltipForElement: vi.fn(),
  }),
}));

vi.mock("@/features/insights/controller/useInsightsPageData", () => ({
  useInsightsPageData: () => pageData,
}));

vi.mock("@/features/insights/useInsightsViewState", () => ({
  useInsightsViewState: () => viewState,
}));

vi.mock("@/features/insights/controller/useInsightsStatsController", () => ({
  useInsightsStatsController: () => statsState,
}));

describe("InsightsPage", () => {
  it("renders the complete backend bucket timeline, including empty buckets", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InsightsPage />
      </QueryClientProvider>,
    );

    // Every bucket from the backend response becomes a row — the empty bucket
    // with no rows renders as a 0-minute row instead of disappearing.
    expect(screen.getByText("2026-05-30 ~ 2026-06-26")).toBeTruthy();
    expect(screen.getByText("2026-06-27 ~ 2026-07-24")).toBeTruthy();
    expect(screen.getByText("2026-07-26 ~ 2026-08-22")).toBeTruthy();
    // The 7月25日 out-of-time day is not in the backend timeline, so the page
    // must not invent a single-day month bucket for it.
    expect(screen.queryByText("2026-07-25 ~ 2026-07-25")).toBeNull();
  });
});

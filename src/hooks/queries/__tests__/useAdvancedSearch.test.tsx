import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupTranslationMock } from "@test/utils";

setupTranslationMock();

const advancedSearchMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/timelogs", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/api/timelogs")>();
  return {
    ...actual,
    timelogsApi: {
      ...actual.timelogsApi,
      advancedSearch: advancedSearchMock,
    },
  };
});

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

import { useAdvancedSearchWithPagination } from "@/hooks/queries/useAdvancedSearch";

const buildResponse = (startTimes: string[]) => ({
  items: startTimes.map((start_time, index) => ({
    id: `entry-${index}`,
    start_time,
  })),
  pagination: { page: 1, size: 10, total: startTimes.length, pages: 1 },
  meta: {
    areas: [],
    people: [],
    tasks: [],
    tags: [],
    tracking_methods: [],
    min_duration_minutes: null,
    max_duration_minutes: null,
    total_count: startTimes.length,
    returned_count: startTimes.length,
  },
});

describe("useAdvancedSearchWithPagination", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    advancedSearchMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("applies the requested sort order client side", async () => {
    advancedSearchMock.mockResolvedValue(
      buildResponse([
        "2026-01-01T10:00:00Z",
        "2026-01-01T08:00:00Z",
        "2026-01-01T09:00:00Z",
      ]),
    );

    const { result } = renderHook(
      () => useAdvancedSearchWithPagination(10),
      { wrapper },
    );

    act(() => {
      result.current.search({ start_date: "2026-01-01", sort_order: "asc" });
    });

    await waitFor(() =>
      expect(result.current.data.map((item) => item.start_time)).toEqual([
        "2026-01-01T08:00:00Z",
        "2026-01-01T09:00:00Z",
        "2026-01-01T10:00:00Z",
      ]),
    );

    act(() => {
      result.current.search({ start_date: "2026-01-01", sort_order: "desc" });
    });

    await waitFor(() =>
      expect(result.current.data.map((item) => item.start_time)).toEqual([
        "2026-01-01T10:00:00Z",
        "2026-01-01T09:00:00Z",
        "2026-01-01T08:00:00Z",
      ]),
    );
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { useTimelogMutations } from "@/hooks/useTimelogMutations";
import { timelogsKeys } from "@/services/api/queryKeys";

const createMock = vi.fn();

vi.mock("@/services/api/timelogs", () => ({
  timelogsApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

const toastMock = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
};

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => toastMock,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/utils/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/core")>();
  return {
    ...actual,
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  };
});

const listKey = timelogsKeys.list({
  start: "2025-01-01T00:00:00.000Z",
  end: "2025-01-01T23:59:59.000Z",
  sort_order: "asc",
  timezone: "UTC",
});

describe("useTimelogMutations", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    createMock.mockReset();
    toastMock.showSuccess.mockReset();
    toastMock.showError.mockReset();
    toastMock.showInfo.mockReset();
  });

  it("merges the raw created timelog into timelog list caches", async () => {
    const existing = {
      id: "existing-1",
      title: "existing",
      start_time: "2025-01-01T02:00:00Z",
      end_time: "2025-01-01T03:00:00Z",
    };
    const created = {
      id: "created-1",
      title: "created",
      start_time: "2025-01-01T03:00:00Z",
      end_time: "2025-01-01T04:00:00Z",
      area_id: "area-1",
      task: { id: "task-1", content: "task" },
      people: [{ id: "person-1", name: "person" }],
    };
    queryClient.setQueryData(listKey, [existing]);
    createMock.mockResolvedValue(created);

    const invalidateSpy = vi.spyOn(
      QueryClient.prototype,
      "invalidateQueries",
    );

    const { result } = renderHook(() => useTimelogMutations(), { wrapper });

    await act(async () => {
      await result.current.createTimelogAsync({
        title: "created",
        start_time: "2025-01-01T03:00:00Z",
        end_time: "2025-01-01T04:00:00Z",
      });
    });

    const cached = queryClient.getQueryData(listKey) as Array<{
      id: string;
      isPlaceholder?: boolean;
    }>;
    expect(cached.map((item) => item.id)).toEqual([
      "created-1",
      "existing-1",
    ]);
    // The merged entry stays in raw Timelog shape; processing belongs to select.
    expect(cached[0].isPlaceholder).toBeUndefined();
    expect(createMock).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalled();
    expect(toastMock.showSuccess).toHaveBeenCalled();

    invalidateSpy.mockRestore();
  });

  it("surfaces a post-mutation refresh failure via toast", async () => {
    queryClient.setQueryData(listKey, []);
    createMock.mockResolvedValue({
      id: "created-1",
      title: "created",
      start_time: "2025-01-01T03:00:00Z",
      end_time: "2025-01-01T04:00:00Z",
    });

    const invalidateSpy = vi
      .spyOn(QueryClient.prototype, "invalidateQueries")
      .mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useTimelogMutations(), { wrapper });

    await act(async () => {
      await result.current.createTimelogAsync({
        title: "created",
        start_time: "2025-01-01T03:00:00Z",
        end_time: "2025-01-01T04:00:00Z",
      });
    });

    expect(toastMock.showError).toHaveBeenCalledWith(
      "timeLog.messages.timeLogRefreshFailed",
      "network down",
    );

    invalidateSpy.mockRestore();
  });
});

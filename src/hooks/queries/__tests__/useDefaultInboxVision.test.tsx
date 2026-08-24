import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDefaultInboxVision } from "@/hooks/queries/useDefaultInboxVision";
import { ToastContext } from "@/contexts/ToastContext";

const getAllMock = vi.fn();

vi.mock("@/services/api/visions", () => ({
  visionsApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
  },
}));

vi.mock("@/hooks/queries/usePreferenceWithBootstrap", () => ({
  usePreferenceWithBootstrap: () => ({
    value: null,
    loading: false,
    saving: false,
    error: null,
    bootstrapped: true,
    saveValue: vi.fn(),
    updateValue: vi.fn(),
  }),
}));

const toastValue = {
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <ToastContext.Provider value={toastValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ToastContext.Provider>
  );
};

describe("useDefaultInboxVision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllMock.mockResolvedValue({
      items: [
        { id: "vision-1", name: "Alpha", status: "active", area_id: null },
      ],
      pagination: { page: 1, size: 100, total: 1, pages: 1 },
      meta: { status_filter: null },
    });
  });

  it("maps the active visions list to id/name options", async () => {
    const { result } = renderHook(() => useDefaultInboxVision(), { wrapper });

    await waitFor(() => {
      expect(result.current.availableVisions).toEqual([
        { id: "vision-1", name: "Alpha" },
      ]);
    });
    expect(getAllMock).toHaveBeenCalledWith("active", 1, 100);
  });
});

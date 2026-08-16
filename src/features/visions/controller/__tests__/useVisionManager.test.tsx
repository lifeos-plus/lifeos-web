import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVisionManager } from "@/features/visions/controller/useVisionManager";
import { ToastContext } from "@/contexts/ToastContext";

const getAllMock = vi.fn();
const deleteMock = vi.fn();
const harvestMock = vi.fn();

vi.mock("@/services/api/visions", () => ({
  visionsApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    harvest: (...args: unknown[]) => harvestMock(...args),
  },
}));

const toastMock = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <ToastContext.Provider
      value={{
        showToast: vi.fn(),
        ...toastMock,
        showWarning: vi.fn(),
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ToastContext.Provider>
  );
};

const vision = { id: "v1", name: "Vision" };

describe("useVisionManager", () => {
  beforeEach(() => {
    getAllMock.mockReset().mockResolvedValue({ items: [] });
    deleteMock.mockReset().mockResolvedValue(undefined);
    harvestMock.mockReset().mockResolvedValue(vision);
    toastMock.showSuccess.mockClear();
    toastMock.showError.mockClear();
  });

  it("shows delete and harvest success toasts", async () => {
    const { result } = renderHook(() => useVisionManager(), { wrapper });

    act(() => {
      result.current.requestDeleteVision(vision as never);
    });
    act(() => {
      result.current.confirmDeleteVision();
    });
    await waitFor(() => {
      expect(toastMock.showSuccess).toHaveBeenCalledWith(
        "visions.messages.deleteSuccess",
        "visions.messages.deleteSuccessDetail",
      );
    });

    act(() => {
      result.current.requestHarvestVision(vision as never);
    });
    act(() => {
      result.current.confirmHarvestVision();
    });
    await waitFor(() => {
      expect(toastMock.showSuccess).toHaveBeenCalledWith(
        "visions.messages.harvestSuccess",
        "visions.messages.harvestSuccessDetail",
      );
    });
  });

  it("surfaces delete and harvest failures through the error toast", async () => {
    deleteMock.mockRejectedValue(new Error("boom"));
    harvestMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useVisionManager(), { wrapper });

    act(() => {
      result.current.requestDeleteVision(vision as never);
    });
    act(() => {
      result.current.confirmDeleteVision();
    });
    await waitFor(() => {
      expect(toastMock.showError).toHaveBeenCalledWith(
        "visions.messages.deleteFailed",
        "boom",
      );
    });

    act(() => {
      result.current.requestHarvestVision(vision as never);
    });
    act(() => {
      result.current.confirmHarvestVision();
    });
    await waitFor(() => {
      expect(toastMock.showError).toHaveBeenCalledWith(
        "visions.messages.harvestFailed",
        "boom",
      );
    });
  });
});

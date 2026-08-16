import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskManagement } from "@/hooks/useTaskManagement";
import { ToastContext } from "@/contexts/ToastContext";
import type { TaskWithSubtasks } from "@/services/api";

const deleteMock = vi.fn();
const updateStatusMock = vi.fn();
const reorderMock = vi.fn();

vi.mock("@/services/api/tasks", () => ({
  tasksApi: {
    delete: (...args: unknown[]) => deleteMock(...args),
    updateStatus: (...args: unknown[]) => updateStatusMock(...args),
    reorder: (...args: unknown[]) => reorderMock(...args),
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

const task = {
  id: "t1",
  content: "Task A",
  status: "todo",
  parent_task_id: null,
} as unknown as TaskWithSubtasks;

describe("useTaskManagement", () => {
  beforeEach(() => {
    deleteMock.mockReset().mockResolvedValue(undefined);
    updateStatusMock.mockReset().mockResolvedValue({ ...task, status: "done" });
    reorderMock.mockReset().mockResolvedValue({});
    toastMock.showSuccess.mockClear();
    toastMock.showError.mockClear();
  });

  it("shows success toasts for delete, status update, and reorder", async () => {
    const { result } = renderHook(() => useTaskManagement(), { wrapper });

    act(() => {
      result.current.actions.handleDeleteTask(task);
    });
    act(() => {
      result.current.actions.confirmDeleteTask();
    });
    await act(async () => {});
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.deleteSuccess",
      "task.messages.deleteSuccessDetail",
    );

    await act(async () => {
      result.current.actions.handleStatusUpdate(task, "done");
    });
    await act(async () => {});
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.statusUpdateSuccess",
      "task.messages.statusUpdateSuccessDetail",
    );

    await act(async () => {
      await result.current.actions.handleTasksReorder([task]);
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.orderUpdateSuccess",
      "task.messages.orderUpdateSuccessDetail",
    );
  });

  it("surfaces delete, status, and reorder failures through the error toast", async () => {
    deleteMock.mockRejectedValue(new Error("boom"));
    updateStatusMock.mockRejectedValue(new Error("boom"));
    reorderMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useTaskManagement(), { wrapper });

    act(() => {
      result.current.actions.handleDeleteTask(task);
    });
    act(() => {
      result.current.actions.confirmDeleteTask();
    });
    await act(async () => {});
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.deleteFailed",
      "task.messages.deleteFailedDetail",
    );

    await act(async () => {
      result.current.actions.handleStatusUpdate(task, "done");
    });
    await act(async () => {});
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.statusUpdateFailed",
      "task.messages.statusUpdateFailedDetail",
    );

    await act(async () => {
      await result.current.actions.handleTasksReorder([task]).catch(() => undefined);
    });
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.orderUpdateFailed",
      "task.messages.orderUpdateFailedDetail",
    );
  });
});

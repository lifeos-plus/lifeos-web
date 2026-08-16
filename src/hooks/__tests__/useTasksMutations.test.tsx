import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTasksMutations } from "@/hooks/useTasksMutations";
import { ToastContext } from "@/contexts/ToastContext";

const createMock = vi.fn();
const updateMock = vi.fn();
const updateStatusMock = vi.fn();
const deleteMock = vi.fn();
const reorderMock = vi.fn();
const moveMock = vi.fn();

vi.mock("@/services/api/tasks", () => ({
  tasksApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    updateStatus: (...args: unknown[]) => updateStatusMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    reorder: (...args: unknown[]) => reorderMock(...args),
    move: (...args: unknown[]) => moveMock(...args),
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

const task = { id: "t1", content: "Task A", status: "todo", parent_task_id: null };

describe("useTasksMutations", () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue(task);
    updateMock.mockReset().mockResolvedValue(task);
    updateStatusMock.mockReset().mockResolvedValue({ ...task, status: "done" });
    deleteMock.mockReset().mockResolvedValue(undefined);
    reorderMock.mockReset().mockResolvedValue({});
    moveMock.mockReset().mockResolvedValue(task);
    toastMock.showSuccess.mockClear();
    toastMock.showError.mockClear();
  });

  it("shows success toasts for every mutation", async () => {
    const { result } = renderHook(() => useTasksMutations(), { wrapper });

    await act(async () => {
      await result.current.createTaskAsync({ content: "Task A", vision_id: null });
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.createSuccess",
      "task.messages.createSuccessDetail",
    );

    await act(async () => {
      await result.current.updateTaskAsync({ id: "t1", data: { content: "Task A" } });
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.updateSuccess",
      "task.messages.updateSuccessDetail",
    );

    await act(async () => {
      await result.current.updateTaskStatusAsync({ id: "t1", status: "done" });
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.statusUpdateSucceeded",
      "task.messages.statusUpdateSucceededDetail",
    );

    await act(async () => {
      await result.current.deleteTaskAsync({ id: "t1" });
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.deleteSucceeded",
    );

    await act(async () => {
      await result.current.reorderTasksAsync([{ id: "t1", display_order: 1 }]);
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.sortUpdateSuccess",
    );

    await act(async () => {
      await result.current.moveTaskAsync({ id: "t1" });
    });
    expect(toastMock.showSuccess).toHaveBeenCalledWith(
      "task.messages.moveSuccess",
      "task.messages.moveSuccessDetail",
    );
  });

  it("surfaces mutation failures through the error toast", async () => {
    createMock.mockRejectedValue("boom");
    updateMock.mockRejectedValue("boom");
    updateStatusMock.mockRejectedValue("boom");
    deleteMock.mockRejectedValue("boom");
    reorderMock.mockRejectedValue("boom");
    moveMock.mockRejectedValue("boom");

    const { result } = renderHook(() => useTasksMutations(), { wrapper });

    for (const run of [
      () => result.current.createTaskAsync({ content: "Task A", vision_id: null }),
      () => result.current.updateTaskAsync({ id: "t1", data: { content: "Task A" } }),
      () => result.current.updateTaskStatusAsync({ id: "t1", status: "done" }),
      () => result.current.deleteTaskAsync({ id: "t1" }),
      () => result.current.reorderTasksAsync([{ id: "t1", display_order: 1 }]),
      () => result.current.moveTaskAsync({ id: "t1" }),
    ]) {
      await act(async () => {
        await run().catch(() => undefined);
      });
    }

    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.createFailed",
      "task.messages.inputHint",
    );
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.updateFailed",
      "task.messages.inputHint",
    );
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.statusUpdateFailed",
      "task.messages.retryLater",
    );
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.deleteFailed",
      "task.messages.retryLater",
    );
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.sortUpdateFailed",
      "task.messages.retryLater",
    );
    expect(toastMock.showError).toHaveBeenCalledWith(
      "task.messages.moveFailed",
      "task.messages.retryLater",
    );
  });
});

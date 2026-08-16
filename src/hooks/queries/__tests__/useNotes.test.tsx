import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotes } from "@/hooks/queries/useNotes";
import { ToastContext } from "@/contexts/ToastContext";

const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/services/api/notes", () => ({
  notesApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

const showError = vi.fn();
const showSuccess = vi.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <ToastContext.Provider
      value={{
        showToast: vi.fn(),
        showSuccess,
        showError,
        showWarning: vi.fn(),
        showInfo: vi.fn(),
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ToastContext.Provider>
  );
};

describe("useNotes", () => {
  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    showError.mockClear();
    showSuccess.mockClear();
  });

  it("shows success and failure toasts for create, update, and delete", async () => {
    createMock.mockResolvedValue({ id: "n1", content: "Note" });
    updateMock.mockResolvedValue({ id: "n1", content: "Note" });
    deleteMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotes(), { wrapper });

    await act(async () => {
      result.current.createNote({ content: "Note" });
    });
    expect(showSuccess).toHaveBeenCalledWith("notes.messages.createSuccess");

    await act(async () => {
      result.current.updateNote({ noteId: "n1", data: { content: "Note" } });
    });
    expect(showSuccess).toHaveBeenCalledWith("notes.messages.updateSuccess");

    await act(async () => {
      result.current.deleteNote("n1");
    });
    expect(showSuccess).toHaveBeenCalledWith("notes.messages.deleteSuccess");
  });

  it("surfaces create, update, and delete failures through the error toast", async () => {
    createMock.mockRejectedValue(new Error("create boom"));
    updateMock.mockRejectedValue(new Error("update boom"));
    deleteMock.mockRejectedValue(new Error("delete boom"));

    const { result } = renderHook(() => useNotes(), { wrapper });

    await act(async () => {
      result.current.createNote({ content: "Note" });
    });
    expect(showError).toHaveBeenCalledWith("notes.messages.createFailed", "create boom");

    await act(async () => {
      result.current.updateNote({ noteId: "n1", data: { content: "Note" } });
    });
    expect(showError).toHaveBeenCalledWith("notes.messages.updateFailed", "update boom");

    await act(async () => {
      result.current.deleteNote("n1");
    });
    expect(showError).toHaveBeenCalledWith("notes.messages.deleteFailed", "delete boom");
  });

  it("resolves the delete mutation through the wrapped action", async () => {
    deleteMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotes(), { wrapper });

    await act(async () => {
      result.current.deleteNote("n2");
    });

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith("n2");
    });
  });
});

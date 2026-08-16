import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePersons } from "@/hooks/queries/usePersons";
import { ToastContext } from "@/contexts/ToastContext";

const getAllMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const getActivitiesMock = vi.fn();

vi.mock("@/services/api/persons", () => ({
  personsApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    getActivities: (...args: unknown[]) => getActivitiesMock(...args),
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

describe("usePersons", () => {
  beforeEach(() => {
    getAllMock.mockReset().mockResolvedValue({ items: [] });
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    getActivitiesMock.mockReset().mockResolvedValue({ items: [] });
    showError.mockClear();
    showSuccess.mockClear();
  });

  it("shows success toasts for person create, update, and delete", async () => {
    createMock.mockResolvedValue({ id: "p1", name: "Person" });
    updateMock.mockResolvedValue({ id: "p1", name: "Person" });
    deleteMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePersons(), { wrapper });

    await act(async () => {
      result.current.createPerson({ name: "Person" });
    });
    expect(showSuccess).toHaveBeenCalledWith("persons.messages.createSuccess");

    await act(async () => {
      result.current.updatePerson("p1", { name: "Person" });
    });
    expect(showSuccess).toHaveBeenCalledWith("persons.messages.updateSuccess");

    await act(async () => {
      result.current.deletePerson("p1");
    });
    expect(showSuccess).toHaveBeenCalledWith("persons.messages.deleteSuccess");
  });

  it("surfaces person mutation failures through the error toast", async () => {
    createMock.mockRejectedValue(new Error("create boom"));
    updateMock.mockRejectedValue(new Error("update boom"));
    deleteMock.mockRejectedValue(new Error("delete boom"));

    const { result } = renderHook(() => usePersons(), { wrapper });

    await act(async () => {
      result.current.createPerson({ name: "Person" });
    });
    expect(showError).toHaveBeenCalledWith("persons.messages.createFailed", "create boom");

    await act(async () => {
      result.current.updatePerson("p1", { name: "Person" });
    });
    expect(showError).toHaveBeenCalledWith("persons.messages.updateFailed", "update boom");

    await act(async () => {
      result.current.deletePerson("p1");
    });
    expect(showError).toHaveBeenCalledWith("persons.messages.deleteFailed", "delete boom");
  });
});

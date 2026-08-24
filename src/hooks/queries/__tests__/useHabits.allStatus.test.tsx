import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVisionManager } from "@/features/visions/controller/useVisionManager";
import { useHabits } from "@/hooks/queries/useHabits";
import { ToastContext } from "@/contexts/ToastContext";

const getAllMock = vi.fn();
const getAssociationsMock = vi.fn();
const getOverviewsMock = vi.fn();

vi.mock("@/services/api/visions", () => ({
  visionsApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
  },
}));

vi.mock("@/services/api/habits", () => ({
  habitsApi: {
    getOverviews: (...args: unknown[]) => getOverviewsMock(...args),
    getHabitTaskAssociations: (...args: unknown[]) =>
      getAssociationsMock(...args),
  },
}));

const toastValue = {
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ToastContext.Provider value={toastValue}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ToastContext.Provider>
    );
  };

// Mounts the visions controller so it writes the habit-task associations cache.
function VisionMount() {
  useVisionManager("active");
  return null;
}

// Mirrors the Habits page: renders the habit list by calling .map on the
// habits query result, exactly like HabitsPage does.
function HabitsProbe() {
  const { habits } = useHabits({ statusFilter: undefined });
  return <div data-testid="probe">{habits.map((h) => h.title).join(",")}</div>;
}

describe("habits all-status filter vs habit-task associations cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllMock.mockResolvedValue({
      items: [
        { id: "vision-1", name: "Vision", status: "active", area_id: null },
      ],
      pagination: { page: 1, size: 100, total: 1, pages: 1 },
      meta: { status_filter: null },
    });
    getAssociationsMock.mockResolvedValue({
      associations: { "task-1": [{ id: "habit-1" }] },
    });
    getOverviewsMock.mockResolvedValue({
      items: [
        {
          habit: {
            id: "habit-1",
            title: "Morning Routine",
            status: "active",
            start_date: "2026-01-01",
            duration_days: 30,
          },
          stats: {},
        },
      ],
      pagination: { page: 1, size: 500, total: 1, pages: 1 },
      meta: { status_filter: null },
    });
  });

  it("renders the all-status habit list after the visions page cached associations", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    // First visit the Visions page: associations get cached.
    const visionView = render(<VisionMount />, { wrapper });
    await waitFor(() => {
      expect(getAssociationsMock).toHaveBeenCalled();
    });
    visionView.unmount();

    // Now open the Habits page with the "All" status filter. The page must
    // not resolve the associations object from the cache (regression:
    // "TypeError: x.map is not a function").
    render(<HabitsProbe />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe(
        "Morning Routine",
      );
    });
  });
});

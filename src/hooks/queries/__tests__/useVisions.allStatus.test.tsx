import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVisionManager } from "@/features/visions/controller/useVisionManager";
import { useVisions } from "@/hooks/queries/useVisions";
import { ToastContext } from "@/contexts/ToastContext";

const getAllMock = vi.fn();
const getAssociationsMock = vi.fn();

vi.mock("@/services/api/visions", () => ({
  visionsApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
  },
}));

vi.mock("@/services/api/habits", () => ({
  habitsApi: {
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

// Mirrors the Visions page with the "All" status filter selected.
function VisionManagerMount() {
  useVisionManager(undefined);
  return null;
}

// Mirrors the Calendar page: maps over the useVisions() result.
function VisionsProbe() {
  const { visions } = useVisions();
  return <div data-testid="probe">{visions.map((v) => v.name).join(",")}</div>;
}

const visionItems = [
  { id: "vision-1", name: "Alpha", status: "active", area_id: null },
  { id: "vision-2", name: "Beta", status: "fruit", area_id: null },
];

describe("useVisions after useVisionManager cached the all-status list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllMock.mockResolvedValue({
      items: visionItems,
      pagination: { page: 1, size: 100, total: 2, pages: 1 },
      meta: { status_filter: null },
    });
    getAssociationsMock.mockResolvedValue({ associations: {} });
  });

  it("renders a proper array when the visions manager cached the same list key", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    // Visit the Visions page first with the "All" filter: the manager writes
    // the shared ["visions","list",{page:1,size:100}] key.
    const visionView = render(<VisionManagerMount />, { wrapper });
    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalled();
    });
    visionView.unmount();

    // Now open the Calendar page: useVisions resolves the same key and must
    // get an array, not the raw response object (regression:
    // "TypeError: L.map is not a function").
    render(<VisionsProbe />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("Alpha,Beta");
    });
  });
});

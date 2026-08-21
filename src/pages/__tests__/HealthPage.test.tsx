import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HealthPage from "@/pages/HealthPage";
import { ModalProvider } from "@/contexts/ModalProvider";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({ setHeader: vi.fn() }),
}));

const healthApiMocks = vi.hoisted(() => ({
  listMenstrualDays: vi.fn(),
  listMenstrualFactors: vi.fn(),
  createMenstrualDay: vi.fn(),
  updateMenstrualDay: vi.fn(),
  deleteMenstrualDay: vi.fn(),
  createMenstrualFactor: vi.fn(),
  deleteMenstrualFactor: vi.fn(),
  listBodyMeasurements: vi.fn(),
  createBodyMeasurement: vi.fn(),
  getBodyMeasurement: vi.fn(),
  updateBodyMeasurement: vi.fn(),
  deleteBodyMeasurement: vi.fn(),
  listSleepSegments: vi.fn(),
  createSleepSegment: vi.fn(),
  getSleepSegment: vi.fn(),
  updateSleepSegment: vi.fn(),
  deleteSleepSegment: vi.fn(),
  listSleepSummaries: vi.fn(),
}));

vi.mock("@/services/api/health", () => ({
  healthApi: healthApiMocks,
}));

const emptyList = () => ({
  items: [],
  pagination: { page: 1, size: 100, total: 0, pages: 0 },
  meta: {},
});

describe("HealthPage", () => {
  beforeEach(() => {
    setupTranslationMock();
    healthApiMocks.listMenstrualDays.mockResolvedValue(emptyList());
    healthApiMocks.listMenstrualFactors.mockResolvedValue(emptyList());
    healthApiMocks.listBodyMeasurements.mockResolvedValue(emptyList());
    healthApiMocks.listSleepSegments.mockResolvedValue(emptyList());
    healthApiMocks.listSleepSummaries.mockResolvedValue(emptyList());
  });

  it("shows the menstrual workspace by default", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<HealthPage />, { wrapper });
    expect(
      await screen.findByText("health.menstrual.empty"),
    ).toBeInTheDocument();
  });

  it("switches between menstrual, body, and sleep tabs", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<HealthPage />, { wrapper });
    await screen.findByText("health.menstrual.empty");

    await user.click(
      screen.getByRole("button", { name: "health.tabs.body" }),
    );
    expect(
      await screen.findByText("health.body.empty"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "health.tabs.sleep" }),
    );
    expect(
      await screen.findByText("health.sleep.noSummary"),
    ).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SleepWorkspace } from "@/features/health/SleepWorkspace";
import { ModalProvider } from "@/contexts/ModalProvider";
import type {
  SleepDailySummary,
  SleepDailySummaryListResponse,
  SleepSegment,
  SleepSegmentListResponse,
} from "@/services/api/health";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

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

describe("SleepWorkspace", () => {
  const summary: SleepDailySummary = {
    sleep_date: "2026-08-19",
    total_minutes: 545,
    segment_count: 2,
    first_start_at: "2026-08-18T22:30:00Z",
    last_end_at: "2026-08-19T07:05:00Z",
  };
  const segment: SleepSegment = {
    id: "segment-1",
    sleep_date: "2026-08-19",
    start_at: "2026-08-18T22:30:00Z",
    end_at: "2026-08-19T06:30:00Z",
    duration_minutes: 480,
    created_at: "2026-08-19T08:00:00Z",
    updated_at: "2026-08-19T08:00:00Z",
  };

  const summaryListResponse = (
    items: SleepDailySummary[],
  ): SleepDailySummaryListResponse => ({
    items,
    pagination: { page: 1, size: 100, total: items.length, pages: 1 },
    meta: {},
  });
  const segmentListResponse = (
    items: SleepSegment[],
  ): SleepSegmentListResponse => ({
    items,
    pagination: { page: 1, size: 100, total: items.length, pages: 1 },
    meta: {},
  });

  beforeEach(() => {
    setupTranslationMock();
    healthApiMocks.listSleepSummaries.mockResolvedValue(
      summaryListResponse([summary]),
    );
    healthApiMocks.listSleepSegments.mockResolvedValue(
      segmentListResponse([segment]),
    );
    healthApiMocks.createSleepSegment.mockResolvedValue(segment);
    healthApiMocks.updateSleepSegment.mockResolvedValue(segment);
    healthApiMocks.deleteSleepSegment.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );

  it("renders the daily summary and segments", async () => {
    renderWithProviders(<SleepWorkspace />, { wrapper });

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("health.sleep.segmentCount")).toBeInTheDocument();
    expect(screen.getByText("health.sleep.firstStart")).toBeInTheDocument();
  });

  it("creates a sleep segment from the form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SleepWorkspace />, { wrapper });

    await screen.findByText("2");
    await user.click(
      screen.getByRole("button", { name: "health.sleep.addSegment" }),
    );

    const dialog = screen.getByRole("dialog");
    const startInput = within(dialog).getByLabelText(/health\.sleep\.startTime/);
    const endInput = within(dialog).getByLabelText(/health\.sleep\.endTime/);
    await user.clear(startInput);
    await user.type(startInput, "2026-08-19T22:00");
    await user.clear(endInput);
    await user.type(endInput, "2026-08-20T06:00");
    await user.click(
      within(dialog).getByRole("button", {
        name: "health.sleep.addSegment",
      }),
    );

    await waitFor(() => {
      expect(healthApiMocks.createSleepSegment).toHaveBeenCalled();
    });
  });

  it("edits a sleep segment from the form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SleepWorkspace />, { wrapper });

    await screen.findByText("2");
    await user.click(
      screen.getByRole("button", { name: "common.edit" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("health.sleep.editTitle"),
    ).toBeInTheDocument();

    const startInput = within(dialog).getByLabelText(/health\.sleep\.startTime/);
    const endInput = within(dialog).getByLabelText(/health\.sleep\.endTime/);
    await user.clear(startInput);
    await user.type(startInput, "2026-08-19T23:00");
    await user.clear(endInput);
    await user.type(endInput, "2026-08-20T07:00");
    await user.click(
      within(dialog).getByRole("button", { name: "common.save" }),
    );

    await waitFor(() => {
      expect(healthApiMocks.updateSleepSegment).toHaveBeenCalledWith(
        "segment-1",
        expect.objectContaining({
          start_at: expect.any(String),
          end_at: expect.any(String),
        }),
      );
    });
  });

  it("deletes a sleep segment after confirmation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SleepWorkspace />, { wrapper });

    await screen.findByText("2");
    await user.click(
      screen.getByRole("button", { name: "common.delete" }),
    );
    await user.click(
      screen.getByRole("button", { name: "health.sleep.deleteConfirm" }),
    );

    await waitFor(() => {
      expect(healthApiMocks.deleteSleepSegment).toHaveBeenCalledWith(
        "segment-1",
      );
    });
  });
});

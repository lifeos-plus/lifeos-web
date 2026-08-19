import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BodyMeasurementWorkspace } from "@/features/health/BodyMeasurementWorkspace";
import { ModalProvider } from "@/contexts/ModalProvider";
import type {
  BodyMeasurement,
  BodyMeasurementListResponse,
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

const measurementListResponse = (
  items: BodyMeasurement[],
): BodyMeasurementListResponse => ({
  items,
  pagination: { page: 1, size: 100, total: items.length, pages: 1 },
  meta: {},
});

describe("BodyMeasurementWorkspace", () => {
  const sourceMeasurement: BodyMeasurement = {
    id: "measurement-1",
    measured_at: "2026-08-19T08:00:00Z",
    weight_kg: 63.5,
    display_unit: "jin",
    bmi: 22.9,
    body_fat_percentage: 22.5,
    visceral_fat: 7,
    fat_mass_kg: null,
    muscle_percentage: null,
    muscle_mass_kg: null,
    body_water_kg: null,
    protein_kg: null,
    bone_mass_kg: null,
    skeletal_muscle_kg: null,
    notes: "morning",
    created_at: "2026-08-19T08:00:00Z",
    updated_at: "2026-08-19T08:00:00Z",
  };

  beforeEach(() => {
    setupTranslationMock();
    healthApiMocks.listBodyMeasurements.mockResolvedValue(
      measurementListResponse([sourceMeasurement]),
    );
    healthApiMocks.createBodyMeasurement.mockResolvedValue(sourceMeasurement);
    healthApiMocks.updateBodyMeasurement.mockResolvedValue(sourceMeasurement);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );

  it("renders measurements with weight and composition badges", async () => {
    renderWithProviders(<BodyMeasurementWorkspace />, { wrapper });

    expect(await screen.findByText(/127.00 jin/)).toBeInTheDocument();
    expect(screen.getByText(/health.body.bodyFat 22.5%/)).toBeInTheDocument();
    expect(screen.getByText(/BMI 22.9/)).toBeInTheDocument();
    expect(screen.getByText("morning")).toBeInTheDocument();
  });

  it("creates a body measurement from the form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BodyMeasurementWorkspace />, { wrapper });

    await screen.findByText(/127.00 jin/);
    await user.click(
      screen.getByRole("button", { name: "health.body.addMeasurement" }),
    );

    const dialog = screen.getByRole("dialog");
    const weightInput = within(dialog).getByLabelText(/health\.body\.weight/);
    await user.clear(weightInput);
    await user.type(weightInput, "70");
    await user.click(
      within(dialog).getByRole("button", {
        name: "health.body.addMeasurement",
      }),
    );

    await waitFor(() => {
      expect(healthApiMocks.createBodyMeasurement).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 70,
          unit: "kg",
          body_fat_percentage: null,
        }),
      );
    });
  });

  it("updates a measurement and clears an emptied metric", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BodyMeasurementWorkspace />, { wrapper });

    await screen.findByText(/127.00 jin/);
    await user.click(
      screen.getByRole("button", { name: "common.edit" }),
    );

    const dialog = screen.getByRole("dialog");
    const bodyFatInput = within(dialog).getByLabelText(/health\.body\.bodyFat/);
    await user.clear(bodyFatInput);
    const weightInput = within(dialog).getByLabelText(/health\.body\.weight/);
    await user.clear(weightInput);
    await user.type(weightInput, "65");
    await user.click(
      within(dialog).getByRole("button", { name: "common.save" }),
    );

    await waitFor(() => {
      expect(healthApiMocks.updateBodyMeasurement).toHaveBeenCalledWith(
        "measurement-1",
        expect.objectContaining({
          weight: 65,
          clear_fields: ["body_fat_percentage"],
        }),
      );
    });
  });
});

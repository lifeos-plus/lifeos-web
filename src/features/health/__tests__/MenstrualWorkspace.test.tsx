import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenstrualWorkspace } from "@/features/health/MenstrualWorkspace";
import { ModalProvider } from "@/contexts/ModalProvider";
import type {
  MenstrualDay,
  MenstrualDayListResponse,
  MenstrualFactorListResponse,
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

const dayListResponse = (items: MenstrualDay[]): MenstrualDayListResponse => ({
  items,
  pagination: { page: 1, size: 200, total: items.length, pages: 1 },
  meta: {},
});

const factorListResponse = (
  items: { id: string; name: string }[],
): MenstrualFactorListResponse => ({
  items,
  pagination: { page: 1, size: 200, total: items.length, pages: 1 },
  meta: {},
});

describe("MenstrualWorkspace", () => {
  const sourceDay: MenstrualDay = {
    id: "day-1",
    log_date: "2026-08-19",
    in_period: true,
    flow_amount: "medium",
    symptoms: ["headache"],
    factors: [{ id: "factor-1", name: "travel" }],
    mood_changes: true,
    protection_used: null,
    spotting: false,
    notes: "evening",
    created_at: "2026-08-19T12:00:00Z",
    updated_at: "2026-08-19T12:00:00Z",
  };

  beforeEach(() => {
    setupTranslationMock();
    healthApiMocks.listMenstrualDays.mockResolvedValue(dayListResponse([sourceDay]));
    healthApiMocks.listMenstrualFactors.mockResolvedValue(
      factorListResponse([{ id: "factor-1", name: "travel" }]),
    );
    healthApiMocks.createMenstrualDay.mockResolvedValue(sourceDay);
    healthApiMocks.updateMenstrualDay.mockResolvedValue(sourceDay);
    healthApiMocks.deleteMenstrualDay.mockResolvedValue(undefined);
    healthApiMocks.createMenstrualFactor.mockResolvedValue({
      id: "factor-2",
      name: "stress",
    });
  });

  it("renders menstrual day records and opens the create form", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    expect(await screen.findByText(/headache/)).toBeInTheDocument();
    expect(screen.getByText(/travel/)).toBeInTheDocument();
    expect(screen.getByText("evening")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "health.menstrual.addDay" }),
    );
    expect(
      screen.getByText("health.menstrual.createTitle"),
    ).toBeInTheDocument();
  });

  it("translates known symptom codes and passes custom symptoms through raw", async () => {
    setupTranslationMock({
      translator: (key: string) =>
        key === "health.menstrual.symptomsLabel"
          ? "Symptoms"
          : key === "health.menstrual.symptom.headache"
            ? "Headache"
            : key,
    });
    const customDay: MenstrualDay = {
      ...sourceDay,
      symptoms: ["headache", "cramps"],
    };
    healthApiMocks.listMenstrualDays.mockResolvedValue(
      dayListResponse([customDay]),
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    expect(
      await screen.findByText(/Symptoms: Headache, cramps/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Symptoms: headache, cramps/),
    ).not.toBeInTheDocument();
  });

  it("creates a menstrual day from the form", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    await screen.findByText(/headache/);
    await user.click(
      screen.getByRole("button", { name: "health.menstrual.addDay" }),
    );

    const dialog = screen.getByRole("dialog");
    const dateInput = within(dialog).getByLabelText(/health\.menstrual\.date/);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-08-20");
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "health.menstrual.inPeriod",
      }),
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "health.menstrual.addDay",
      }),
    );

    await waitFor(() => {
      expect(healthApiMocks.createMenstrualDay).toHaveBeenCalledWith({
        log_date: "2026-08-20",
        in_period: true,
        flow_amount: null,
        symptoms: [],
        mood_changes: null,
        protection_used: null,
        spotting: null,
        factor_names: [],
        notes: null,
      });
    });
  });

  it("updates a menstrual day from the edit form", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    await screen.findByText(/headache/);
    await user.click(screen.getByRole("button", { name: "common.edit" }));

    const dialog = screen.getByRole("dialog");
    const flowSelect = within(dialog).getByLabelText(
      /health\.menstrual\.flowAmount/,
    );
    await user.selectOptions(flowSelect, "low");
    await user.click(
      within(dialog).getByRole("button", { name: "common.save" }),
    );

    await waitFor(() => {
      expect(healthApiMocks.updateMenstrualDay).toHaveBeenCalledWith(
        "day-1",
        expect.objectContaining({
          flow_amount: "low",
          clear_flow: false,
        }),
      );
    });
  });

  it("creates a custom factor from the factor manager", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    await screen.findByText(/headache/);
    await user.click(
      screen.getByRole("button", { name: "health.menstrual.manageFactors" }),
    );
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "health.menstrual.factorName",
      }),
      "stress",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "health.menstrual.addFactor",
      }),
    );

    await waitFor(() => {
      expect(healthApiMocks.createMenstrualFactor).toHaveBeenCalledWith({
        name: "stress",
      });
    });
  });

  it("deletes a menstrual day after confirmation", async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    renderWithProviders(<MenstrualWorkspace />, { wrapper });

    await screen.findByText(/headache/);
    await user.click(
      screen.getByRole("button", { name: "common.delete" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "health.menstrual.deleteConfirm",
      }),
    );

    await waitFor(() => {
      expect(healthApiMocks.deleteMenstrualDay).toHaveBeenCalledWith("day-1");
    });
  });
});

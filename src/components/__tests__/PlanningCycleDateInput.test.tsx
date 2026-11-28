import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlanningCycleDateInput } from "@/components/PlanningCycleDateInput";
import { setupTranslationMock } from "@test/utils";

setupTranslationMock({
  translator: (key) => {
    if (key.startsWith("months.")) {
      return `Month ${key.split(".")[1]}`;
    }
    return key;
  },
});

type MockDropdownOptions = {
  isOpen: boolean;
  usePortal?: boolean;
  [key: string]: unknown;
};

vi.mock("@/hooks/useCalendarAdapter", async () => {
  const { GregorianCalendarAdapter } = await import(
    "@/utils/calendar/GregorianCalendarAdapter"
  );
  return {
    usePlanningCycle: () => ({
      adapter: new GregorianCalendarAdapter(),
    }),
  };
});

vi.mock("@/components/selects/useDropdownSurface", () => ({
  useDropdownSurface: (options: MockDropdownOptions) => ({
    isOpen: options.isOpen,
    menuRef: { current: null },
    menuPos: { top: 0, left: 0, width: 240, maxHeight: 320 },
    dataTheme: undefined,
    usePortal: options.usePortal ?? true,
    portalTarget: null,
    getSurfaceStyle: (style: Record<string, unknown> = {}) => ({
      position: options.usePortal ? "fixed" : "absolute",
      ...style,
    }),
    renderSurface: (element: React.ReactElement) =>
      options.isOpen ? element : null,
    recomputePosition: vi.fn(),
  }),
}));

describe("PlanningCycleDateInput", () => {
  it("keeps the selected year when changing a monthly planning month", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="month"
        startDate="2025-05-01"
        onStartDateChange={handleChange}
        id="planning-month"
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("button", { name: "Month 6" }));

    await waitFor(() => expect(handleChange).toHaveBeenCalledWith("2025-06-01"));
  });

  it("ignores out-of-range dates produced by native year segments", async () => {
    // Typing a single digit over the year segment turns 2026-11-28 into
    // 0007-11-28 in the browser. That must never be committed, otherwise the
    // planning list crashes while resolving the cycle for year 7.
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="day"
        startDate="2026-11-28"
        onStartDateChange={handleChange}
        id="planning-day"
      />,
    );

    const input = screen.getByDisplayValue("2026-11-28");
    fireEvent.change(input, { target: { value: "0007-11-28" } });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("still commits supported day changes", async () => {
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="day"
        startDate="2026-11-28"
        onStartDateChange={handleChange}
        id="planning-day"
      />,
    );

    fireEvent.change(screen.getByDisplayValue("2026-11-28"), {
      target: { value: "2026-12-01" },
    });

    await waitFor(() =>
      expect(handleChange).toHaveBeenCalledWith("2026-12-01"),
    );
  });

  it("snaps supported weekly dates to the week start", async () => {
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="week"
        startDate="2026-11-23"
        onStartDateChange={handleChange}
        id="planning-week"
      />,
    );

    const input = screen.getByDisplayValue("2026-11-23");
    fireEvent.change(input, { target: { value: "0007-11-28" } });
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "2026-11-26" } });
    await waitFor(() =>
      expect(handleChange).toHaveBeenCalledWith("2026-11-23"),
    );
  });

  it("falls back to a plain date input for unknown cycle types", async () => {
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="custom"
        startDate="2026-11-28"
        onStartDateChange={handleChange}
        id="planning-custom"
      />,
    );

    const input = screen.getByDisplayValue("2026-11-28");
    fireEvent.change(input, { target: { value: "0007-11-28" } });
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() =>
      expect(handleChange).toHaveBeenCalledWith(undefined),
    );
  });

  it("clears the week start when the input is emptied", async () => {
    const handleChange = vi.fn();

    render(
      <PlanningCycleDateInput
        cycleType="week"
        startDate="2026-11-23"
        onStartDateChange={handleChange}
        id="planning-week"
      />,
    );

    fireEvent.change(screen.getByDisplayValue("2026-11-23"), {
      target: { value: "" },
    });

    await waitFor(() => expect(handleChange).toHaveBeenCalledWith(undefined));
  });
});

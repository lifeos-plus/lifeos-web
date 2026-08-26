import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCalendarAdapter } from "@/hooks/useCalendarAdapter";
import { MayanCalendarAdapter } from "@/utils/calendar";

const preferenceValues = vi.hoisted(() => ({
  calendarSystem: { value: "mayan_13_moon" as const },
  firstDay: { value: 1 },
  anchorYear: { value: 2025 } as { value: number | null },
  mayanNewYear: { value: "03-01" } as { value: string | null },
}));

vi.mock("@/hooks/queries/usePreferenceWithBootstrap", () => ({
  usePreferenceWithBootstrap: (options: { key: string; defaultValue: unknown }) => {
    const values: Record<string, { value: unknown }> = {
      "calendar.system": preferenceValues.calendarSystem,
      "calendar.first_day_of_week": preferenceValues.firstDay,
      "calendar.seven_year_anchor_year": preferenceValues.anchorYear,
      "calendar.mayan_new_year_start": preferenceValues.mayanNewYear,
    };
    const matched = values[options.key];
    return {
      value: matched ? matched.value : options.defaultValue,
      loading: false,
      saving: false,
      error: null,
      bootstrapped: true,
      saveValue: vi.fn(async () => true),
      updateValue: vi.fn(),
    };
  },
}));

describe("useCalendarAdapter", () => {
  it("derives the adapter from configured calendar preferences", () => {
    const { result } = renderHook(() => useCalendarAdapter());

    expect(result.current.calendarSystem).toBe("mayan_13_moon");
    expect(result.current.sevenYearAnchorYear).toBe(2025);
    expect(result.current.mayanNewYearStart).toBe("03-01");
    expect(result.current.adapter).toBeInstanceOf(MayanCalendarAdapter);
    expect(
      result.current.adapter.getYearStart(new Date(2028, 1, 28)),
    ).toEqual(new Date(2027, 2, 1));
  });

  it("falls back to defaults for invalid preference values", () => {
    preferenceValues.anchorYear.value = null;
    preferenceValues.mayanNewYear.value = "invalid";

    const { result } = renderHook(() => useCalendarAdapter());

    expect(result.current.sevenYearAnchorYear).toBe(2025);
    expect(result.current.mayanNewYearStart).toBe("07-26");

    preferenceValues.anchorYear.value = 2025;
    preferenceValues.mayanNewYear.value = "03-01";
  });
});

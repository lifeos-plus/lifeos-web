import { useMemo } from "react";
import { usePreferenceWithBootstrap } from "./queries/usePreferenceWithBootstrap";
import {
  DEFAULT_MAYAN_NEW_YEAR_START,
  DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
  createCalendarAdapter,
} from "@/utils/calendar";
import { parseDateKey } from "@/utils/datetime";
import type {
  CalendarAdapter,
  CalendarSystem,
  ExtendedPlanningViewType,
} from "@/utils/calendar";

interface CalendarAdapterState {
  adapter: CalendarAdapter;
  calendarSystem: CalendarSystem;
  firstDayOfWeek: number;
  sevenYearAnchorYear: number;
  mayanNewYearStart: string;
  loading: boolean;
}

export function useCalendarAdapter(): CalendarAdapterState {
  const calendarSystemPreference = usePreferenceWithBootstrap<CalendarSystem>({
    key: "calendar.system",
    defaultValue: "gregorian",
    module: "calendar",
    validator: (value) => value === "gregorian" || value === "mayan_13_moon",
  });

  const firstDayPreference = usePreferenceWithBootstrap<number>({
    key: "calendar.first_day_of_week",
    defaultValue: 1,
    module: "calendar",
    validator: (value) => Number.isFinite(value) && value >= 1 && value <= 7,
  });
  const sevenYearAnchorPreference = usePreferenceWithBootstrap<number>({
    key: "calendar.seven_year_anchor_year",
    defaultValue: DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
    module: "calendar",
    validator: (value) =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 9999,
  });
  const mayanNewYearPreference = usePreferenceWithBootstrap<string>({
    key: "calendar.mayan_new_year_start",
    defaultValue: DEFAULT_MAYAN_NEW_YEAR_START,
    module: "calendar",
    validator: (value) => /^\d{2}-\d{2}$/.test(value),
  });

  const calendarSystem: CalendarSystem =
    calendarSystemPreference.value === "mayan_13_moon"
      ? "mayan_13_moon"
      : "gregorian";
  const firstDayOfWeek = Number.isFinite(firstDayPreference.value)
    ? firstDayPreference.value
    : 1;
  const sevenYearAnchorYear =
    typeof sevenYearAnchorPreference.value === "number" &&
    Number.isInteger(sevenYearAnchorPreference.value)
      ? sevenYearAnchorPreference.value
      : DEFAULT_SEVEN_YEAR_ANCHOR_YEAR;
  const mayanNewYearStart =
    typeof mayanNewYearPreference.value === "string" &&
    /^\d{2}-\d{2}$/.test(mayanNewYearPreference.value)
      ? mayanNewYearPreference.value
      : DEFAULT_MAYAN_NEW_YEAR_START;

  const adapter = useMemo(() => {
    return createCalendarAdapter(
      calendarSystem,
      firstDayOfWeek,
      sevenYearAnchorYear,
      mayanNewYearStart,
    );
  }, [calendarSystem, firstDayOfWeek, sevenYearAnchorYear, mayanNewYearStart]);

  return {
    adapter,
    calendarSystem,
    firstDayOfWeek,
    sevenYearAnchorYear,
    mayanNewYearStart,
    loading:
      calendarSystemPreference.loading ||
      firstDayPreference.loading ||
      sevenYearAnchorPreference.loading ||
      mayanNewYearPreference.loading,
  };
}

export function usePlanningCycle() {
  const { adapter, calendarSystem } = useCalendarAdapter();

  const getDefaultCycleSettings = (
    cycleType: ExtendedPlanningViewType,
    baseDate: Date = new Date(),
  ) => {
    const range = adapter.getPeriodRange(cycleType, baseDate);
    const startDate = parseDateKey(range.start);
    const days = adapter.getPlanningCycleDays(cycleType, startDate);

    return {
      startDate: range.start,
      days,
    };
  };

  const getQuickSetOptions = (baseDate: Date = new Date()) => {
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      today: getDefaultCycleSettings("day", baseDate),
      tomorrow: getDefaultCycleSettings("day", tomorrow),
      thisWeek: getDefaultCycleSettings("week", baseDate),
      thisMonth: getDefaultCycleSettings("month", baseDate),
      thisYear: getDefaultCycleSettings("year", baseDate),
    };
  };

  return {
    adapter,
    calendarSystem,
    getDefaultCycleSettings,
    getQuickSetOptions,
  };
}

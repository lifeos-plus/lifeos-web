import { useMemo } from "react";
import { usePreferenceWithBootstrap } from "./queries/usePreferenceWithBootstrap";
import {
  DEFAULT_MAYAN_NEW_YEAR_START,
  DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
  createCalendarAdapter,
} from "@/utils/calendar";
import { parseDateKey } from "@/utils/datetime";
import {
  DEFAULT_CALENDAR_SYSTEM,
  DEFAULT_FIRST_DAY_OF_WEEK,
  isValidCalendarSystem,
  isValidFirstDayOfWeek,
  isValidMayanNewYearStart,
  isValidSevenYearAnchorYear,
} from "@/config/calendarPreferences";
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
    defaultValue: DEFAULT_CALENDAR_SYSTEM,
    module: "calendar",
    validator: isValidCalendarSystem,
  });

  const firstDayPreference = usePreferenceWithBootstrap<number>({
    key: "calendar.first_day_of_week",
    defaultValue: DEFAULT_FIRST_DAY_OF_WEEK,
    module: "calendar",
    validator: isValidFirstDayOfWeek,
  });
  const sevenYearAnchorPreference = usePreferenceWithBootstrap<number>({
    key: "calendar.seven_year_anchor_year",
    defaultValue: DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
    module: "calendar",
    validator: isValidSevenYearAnchorYear,
  });
  const mayanNewYearPreference = usePreferenceWithBootstrap<string>({
    key: "calendar.mayan_new_year_start",
    defaultValue: DEFAULT_MAYAN_NEW_YEAR_START,
    module: "calendar",
    validator: isValidMayanNewYearStart,
  });

  const calendarSystem: CalendarSystem =
    calendarSystemPreference.value === "mayan_13_moon"
      ? "mayan_13_moon"
      : "gregorian";
  // Defensive: the preference hook validates, but the adapter must never build
  // an invalid calendar from an unexpected value.
  const firstDayOfWeek = isValidFirstDayOfWeek(firstDayPreference.value)
    ? firstDayPreference.value
    : DEFAULT_FIRST_DAY_OF_WEEK;
  const sevenYearAnchorYear = isValidSevenYearAnchorYear(
    sevenYearAnchorPreference.value,
  )
    ? sevenYearAnchorPreference.value
    : DEFAULT_SEVEN_YEAR_ANCHOR_YEAR;
  const mayanNewYearStart = isValidMayanNewYearStart(
    mayanNewYearPreference.value,
  )
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

/**
 * Pure helpers over an existing calendar adapter. Kept separate from
 * `usePlanningCycle` so a page that already holds an adapter can reuse it
 * instead of instantiating the calendar preferences a second time.
 */
export function createPlanningCycleHelpers(adapter: CalendarAdapter) {
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

  return { getDefaultCycleSettings, getQuickSetOptions };
}

export type PlanningCycleContext = {
  adapter: CalendarAdapter;
} & ReturnType<typeof createPlanningCycleHelpers>;

export function usePlanningCycle(): PlanningCycleContext & {
  calendarSystem: CalendarSystem;
} {
  const { adapter, calendarSystem } = useCalendarAdapter();

  return {
    adapter,
    calendarSystem,
    ...createPlanningCycleHelpers(adapter),
  };
}

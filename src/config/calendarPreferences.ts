/**
 * Validation rules for calendar preferences.
 *
 * Both the settings page and the calendar adapter read the same preference
 * keys, so the accepted value ranges must live in one place. Keeping separate
 * copies previously let `calendar.first_day_of_week` accept fractional values
 * in one path and reject them in the other.
 */

import type { CalendarSystem } from "@/utils/calendar";

export const DEFAULT_CALENDAR_SYSTEM: CalendarSystem = "gregorian";
export const DEFAULT_FIRST_DAY_OF_WEEK = 1;

export function isValidCalendarSystem(value: unknown): value is CalendarSystem {
  return value === "gregorian" || value === "mayan_13_moon";
}

export function isValidFirstDayOfWeek(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

export function isValidSevenYearAnchorYear(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9999
  );
}

export function isValidMayanNewYearStart(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}-\d{2}$/.test(value);
}

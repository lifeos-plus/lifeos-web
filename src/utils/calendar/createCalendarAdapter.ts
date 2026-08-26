import type { CalendarAdapter } from "./CalendarAdapter";
import {
  DEFAULT_MAYAN_NEW_YEAR_START,
  DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
} from "./CalendarAdapter";
import { GregorianCalendarAdapter } from "./GregorianCalendarAdapter";
import { MayanCalendarAdapter } from "./MayanCalendarAdapter";

export type CalendarSystem = "gregorian" | "mayan_13_moon";

export function createCalendarAdapter(
  system: CalendarSystem,
  firstDayOfWeek: number = 1,
  sevenYearAnchorYear: number = DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
  mayanNewYearStart: string = DEFAULT_MAYAN_NEW_YEAR_START,
): CalendarAdapter {
  switch (system) {
    case "gregorian":
      return new GregorianCalendarAdapter(firstDayOfWeek, sevenYearAnchorYear);
    case "mayan_13_moon":
      return new MayanCalendarAdapter(
        firstDayOfWeek,
        sevenYearAnchorYear,
        mayanNewYearStart,
      );
    default:
      throw new Error(`Unsupported calendar system: ${system}`);
  }
}

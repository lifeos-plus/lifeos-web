import type { AggregatedAreaPeriod } from "@/services/api/stats";

export interface PeriodBoundary {
  start: string;
  end: string;
}

/**
 * Adapt the backend-provided bucket timeline to renderable boundaries.
 *
 * The aggregated-areas endpoint owns calendar bucket logic and returns every
 * bucket in the range (including buckets without data), so the UI only
 * converts the transport shape here instead of re-deriving periods.
 */
export const toPeriodBoundaries = (
  periods: AggregatedAreaPeriod[],
): PeriodBoundary[] =>
  periods.map((period) => ({
    start: period.period_start,
    end: period.period_end,
  }));

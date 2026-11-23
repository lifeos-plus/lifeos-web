import type { UUID } from "@/types/primitive";
import { http } from "./client";
import type { components } from "./generated/schema";
import { ENDPOINTS } from "./endpoints";

export type DailyAreaRow = components["schemas"]["DailyAreaResponse"];
export type AggregationGranularity = components["schemas"]["AggregatedAreaResponse"]["granularity"];
export type AggregatedAreaRow = components["schemas"]["AggregatedAreaResponse"];
export type AggregatedAreaPeriod = components["schemas"]["AggregatedAreaPeriodResponse"];
export type DailyAreaListResponse = components["schemas"]["ListResponse_DailyAreaResponse_DailyAreaMeta_"];
export type AggregatedAreaListResponse = components["schemas"]["AggregatedAreasListResponse"];
export type DayBreakdownListResponse = components["schemas"]["ListResponse_DayBreakdownResponse_DayBreakdownMeta_"];

export const statsApi = {
  async getDailyAreas(
    start: string,
    end: string,
    areaIds?: UUID[],
  ) {
    return http.get<DailyAreaListResponse>(ENDPOINTS.STATS.DAILY_AREAS, {
      start,
      end,
      area_ids: areaIds,
    });
  },
  async getLocalDayBreakdown(day: string, options?: { signal?: AbortSignal }) {
    return http.get<DayBreakdownListResponse>(
      ENDPOINTS.STATS.DAY_BREAKDOWN,
      { day },
      { signal: options?.signal },
    );
  },
  async getAggregatedAreas(
    granularity: AggregationGranularity,
    start: string,
    end: string,
    options?: {
      areaIds?: UUID[];
      page?: number;
      size?: number;
    },
  ) {
    return http.get<AggregatedAreaListResponse>(
      ENDPOINTS.STATS.AGGREGATED_AREAS,
      {
        granularity,
        start,
        end,
        area_ids: options?.areaIds,
        page: options?.page,
        size: options?.size,
      },
    );
  },
  async recomputeDailyAreas(
    start: string,
    end: string,
  ) {
    return http.post<components["schemas"]["RecomputeDailyAreasResponse"]>(
      ENDPOINTS.STATS.DAILY_AREAS_RECOMPUTE,
      undefined,
      { start, end },
    );
  },
};

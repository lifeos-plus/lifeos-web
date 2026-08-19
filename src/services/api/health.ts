import type { UUID } from "@/types/primitive";
import { http } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { components } from "./generated/schema";

export type MenstrualDay = components["schemas"]["MenstrualDayResponse"];
export type MenstrualDayCreate = components["schemas"]["MenstrualDayCreate"];
export type MenstrualDayUpdate = components["schemas"]["MenstrualDayUpdate"];
export type MenstrualFactor = components["schemas"]["MenstrualFactorResponse"];
export type MenstrualFactorCreate = components["schemas"]["MenstrualFactorCreate"];
export type BodyMeasurement = components["schemas"]["BodyMeasurementResponse"];
export type BodyMeasurementCreate = components["schemas"]["BodyMeasurementCreate"];
export type BodyMeasurementUpdate = components["schemas"]["BodyMeasurementUpdate"];
export type SleepSegment = components["schemas"]["SleepSegmentResponse"];
export type SleepSegmentCreate = components["schemas"]["SleepSegmentCreate"];
export type SleepSegmentUpdate = components["schemas"]["SleepSegmentUpdate"];
export type SleepDailySummary = components["schemas"]["SleepDailySummaryResponse"];

export type MenstrualDayListResponse =
  components["schemas"]["ListResponse_MenstrualDayResponse_EmptyMeta_"];
export type MenstrualFactorListResponse =
  components["schemas"]["ListResponse_MenstrualFactorResponse_EmptyMeta_"];
export type BodyMeasurementListResponse =
  components["schemas"]["ListResponse_BodyMeasurementResponse_EmptyMeta_"];
export type SleepSegmentListResponse =
  components["schemas"]["ListResponse_SleepSegmentResponse_EmptyMeta_"];
export type SleepDailySummaryListResponse =
  components["schemas"]["ListResponse_SleepDailySummaryResponse_EmptyMeta_"];

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}

export const healthApi = {
  listMenstrualDays: (params: DateRangeParams = {}) =>
    http.get<MenstrualDayListResponse>(ENDPOINTS.HEALTH.MENSTRUAL_DAYS, {
      page: params.page ?? 1,
      size: params.size ?? 200,
      ...(params.start_date ? { start_date: params.start_date } : {}),
      ...(params.end_date ? { end_date: params.end_date } : {}),
    }),
  createMenstrualDay: (payload: MenstrualDayCreate) =>
    http.post<MenstrualDay>(ENDPOINTS.HEALTH.MENSTRUAL_DAYS, payload),
  getMenstrualDay: (dayId: UUID) =>
    http.get<MenstrualDay>(ENDPOINTS.HEALTH.MENSTRUAL_DAY_BY_ID(dayId)),
  updateMenstrualDay: (dayId: UUID, payload: MenstrualDayUpdate) =>
    http.patch<MenstrualDay>(ENDPOINTS.HEALTH.MENSTRUAL_DAY_BY_ID(dayId), payload),
  deleteMenstrualDay: (dayId: UUID) =>
    http.delete<void>(ENDPOINTS.HEALTH.MENSTRUAL_DAY_BY_ID(dayId)),

  listMenstrualFactors: (params: { page?: number; size?: number } = {}) =>
    http.get<MenstrualFactorListResponse>(ENDPOINTS.HEALTH.MENSTRUAL_FACTORS, {
      page: params.page ?? 1,
      size: params.size ?? 200,
    }),
  createMenstrualFactor: (payload: MenstrualFactorCreate) =>
    http.post<MenstrualFactor>(ENDPOINTS.HEALTH.MENSTRUAL_FACTORS, payload),
  deleteMenstrualFactor: (factorId: UUID) =>
    http.delete<void>(ENDPOINTS.HEALTH.MENSTRUAL_FACTOR_BY_ID(factorId)),

  listBodyMeasurements: (params: DateRangeParams = {}) =>
    http.get<BodyMeasurementListResponse>(ENDPOINTS.HEALTH.BODY_MEASUREMENTS, {
      page: params.page ?? 1,
      size: params.size ?? 100,
      ...(params.start_date ? { start_date: params.start_date } : {}),
      ...(params.end_date ? { end_date: params.end_date } : {}),
    }),
  createBodyMeasurement: (payload: BodyMeasurementCreate) =>
    http.post<BodyMeasurement>(ENDPOINTS.HEALTH.BODY_MEASUREMENTS, payload),
  getBodyMeasurement: (measurementId: UUID) =>
    http.get<BodyMeasurement>(ENDPOINTS.HEALTH.BODY_MEASUREMENT_BY_ID(measurementId)),
  updateBodyMeasurement: (measurementId: UUID, payload: BodyMeasurementUpdate) =>
    http.patch<BodyMeasurement>(ENDPOINTS.HEALTH.BODY_MEASUREMENT_BY_ID(measurementId), payload),
  deleteBodyMeasurement: (measurementId: UUID) =>
    http.delete<void>(ENDPOINTS.HEALTH.BODY_MEASUREMENT_BY_ID(measurementId)),

  listSleepSegments: (params: DateRangeParams & { sleep_date?: string } = {}) =>
    http.get<SleepSegmentListResponse>(ENDPOINTS.HEALTH.SLEEP_SEGMENTS, {
      page: params.page ?? 1,
      size: params.size ?? 100,
      ...(params.sleep_date ? { sleep_date: params.sleep_date } : {}),
      ...(params.start_date ? { start_date: params.start_date } : {}),
      ...(params.end_date ? { end_date: params.end_date } : {}),
    }),
  createSleepSegment: (payload: SleepSegmentCreate) =>
    http.post<SleepSegment>(ENDPOINTS.HEALTH.SLEEP_SEGMENTS, payload),
  getSleepSegment: (segmentId: UUID) =>
    http.get<SleepSegment>(ENDPOINTS.HEALTH.SLEEP_SEGMENT_BY_ID(segmentId)),
  updateSleepSegment: (segmentId: UUID, payload: SleepSegmentUpdate) =>
    http.patch<SleepSegment>(ENDPOINTS.HEALTH.SLEEP_SEGMENT_BY_ID(segmentId), payload),
  deleteSleepSegment: (segmentId: UUID) =>
    http.delete<void>(ENDPOINTS.HEALTH.SLEEP_SEGMENT_BY_ID(segmentId)),
  listSleepSummaries: (params: { start_date?: string; end_date?: string } = {}) =>
    http.get<SleepDailySummaryListResponse>(ENDPOINTS.HEALTH.SLEEP_SUMMARY, params),
};

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { healthApi } from "@/services/api/health";

describe("healthApi", () => {
  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists menstrual days with date range params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: [],
        pagination: { page: 1, size: 200, total: 0, pages: 0 },
        meta: {},
      }),
    );

    await healthApi.listMenstrualDays({
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedUrl = new URL(url);
    expect(parsedUrl.pathname).toBe(
      new URL(ENDPOINTS.HEALTH.MENSTRUAL_DAYS, "http://localhost").pathname,
    );
    expect(parsedUrl.searchParams.get("start_date")).toBe("2026-08-01");
    expect(parsedUrl.searchParams.get("end_date")).toBe("2026-08-31");
    expect(init.method).toBe("GET");
  });

  it("creates, updates, and deletes a menstrual day", async () => {
    const payload = {
      log_date: "2026-08-19",
      in_period: true,
      flow_amount: "medium",
      symptoms: ["headache"],
      mood_changes: true,
      protection_used: null,
      spotting: null,
      factor_names: ["travel"],
      notes: null,
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        jsonResponse({
          id: "day-1",
          ...payload,
          factors: [{ id: "factor-1", name: "travel" }],
          created_at: "2026-08-19T12:00:00Z",
          updated_at: "2026-08-19T12:00:00Z",
        }),
      );

    await healthApi.createMenstrualDay(payload);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");

    await healthApi.updateMenstrualDay("day-1", { flow_amount: "low" });
    const updateUrl = new URL(fetchMock.mock.calls[1][0] as string);
    expect(updateUrl.pathname).toContain("/menstrual-days/day-1");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");

    await healthApi.deleteMenstrualDay("day-1");
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });

  it("manages menstrual factors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ id: "factor-1", name: "travel" }));

    await healthApi.listMenstrualFactors({});
    expect(fetchMock.mock.calls[0][1]?.method).toBe("GET");

    await healthApi.createMenstrualFactor({ name: "travel" });
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");

    await healthApi.deleteMenstrualFactor("factor-1");
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });

  it("manages body measurements and sleep data", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        jsonResponse({
          items: [],
          pagination: { page: 1, size: 100, total: 0, pages: 0 },
          meta: {},
        }),
      );

    await healthApi.listBodyMeasurements({});
    await healthApi.getBodyMeasurement("measurement-1");
    await healthApi.updateBodyMeasurement("measurement-1", { weight: 65 });
    await healthApi.deleteBodyMeasurement("measurement-1");
    expect(fetchMock.mock.calls.map((call) => call[1]?.method)).toEqual([
      "GET",
      "GET",
      "PATCH",
      "DELETE",
    ]);

    await healthApi.listSleepSegments({ sleep_date: "2026-08-19" });
    await healthApi.createSleepSegment({
      start_at: "2026-08-18T22:00:00Z",
      end_at: "2026-08-19T06:00:00Z",
    });
    await healthApi.getSleepSegment("segment-1");
    await healthApi.updateSleepSegment("segment-1", { end_at: "2026-08-19T07:00:00Z" });
    await healthApi.deleteSleepSegment("segment-1");
    await healthApi.listSleepSummaries({
      start_date: "2026-08-19",
      end_date: "2026-08-19",
    });
    expect(fetchMock.mock.calls.slice(4).map((call) => call[1]?.method)).toEqual([
      "GET",
      "POST",
      "GET",
      "PATCH",
      "DELETE",
      "GET",
    ]);
  });

  it("creates a body measurement", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        id: "measurement-1",
        measured_at: "2026-08-19T08:00:00Z",
        weight_kg: 63.5,
        display_unit: "kg",
        bmi: null,
        body_fat_percentage: null,
        visceral_fat: null,
        fat_mass_kg: null,
        muscle_percentage: null,
        muscle_mass_kg: null,
        body_water_kg: null,
        protein_kg: null,
        bone_mass_kg: null,
        skeletal_muscle_kg: null,
        notes: null,
        created_at: "2026-08-19T08:00:00Z",
        updated_at: "2026-08-19T08:00:00Z",
      }),
    );

    await healthApi.createBodyMeasurement({
      measured_at: "2026-08-19T08:00:00Z",
      weight: 127,
      unit: "jin",
      body_fat_percentage: 22.5,
      notes: null,
    });

    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    const parsedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(parsedUrl.pathname).toContain("/body-measurements");
  });
});

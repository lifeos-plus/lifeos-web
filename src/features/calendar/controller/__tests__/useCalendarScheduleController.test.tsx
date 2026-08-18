import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCalendarScheduleController } from "@/features/calendar/controller/useCalendarScheduleController";
import type { PlannedEvent, Task, Timelog, Vision } from "@/services/api";
import type { UUID } from "@/types/primitive";
import {
  DEFAULT_AREA_COLOR,
  UNKNOWN_AREA_COLOR,
} from "@/utils/areaColors";

const plannedEventsFetchRangeMock = vi.fn();
const timelogsFetchRangeMock = vi.fn();

vi.mock("@/services/api/plannedEvents", () => ({
  plannedEventsApi: {
    fetchRange: (...args: unknown[]) => plannedEventsFetchRangeMock(...args),
  },
}));

vi.mock("@/services/api/timelogs", () => ({
  timelogsApi: {
    fetchRange: (...args: unknown[]) => timelogsFetchRangeMock(...args),
  },
}));

const createPlannedEvent = (
  overrides: Partial<PlannedEvent> = {},
): PlannedEvent => ({
  id: overrides.id ?? "planned-1",
  title: overrides.title ?? "Planned",
  start_time: overrides.start_time ?? "2026-01-01T00:00:00Z",
  end_time: overrides.end_time ?? "2026-01-01T01:00:00Z",
  area_id: overrides.area_id ?? null,
  task_id: overrides.task_id ?? null,
  priority: overrides.priority ?? 0,
  is_all_day: overrides.is_all_day ?? false,
  is_instance: overrides.is_instance ?? false,
  is_recurring: overrides.is_recurring ?? false,
  master_event_id: overrides.master_event_id ?? null,
  instance_id: overrides.instance_id ?? null,
  status: overrides.status ?? "planned",
  tags: overrides.tags ?? [],
  person: overrides.person ?? [],
  extra_data: overrides.extra_data ?? {},
  recurrence_pattern: overrides.recurrence_pattern ?? null,
  rrule_string: overrides.rrule_string ?? null,
});

const createTimelog = (overrides: Partial<Timelog> = {}): Timelog => ({
  id: overrides.id ?? "timelog-1",
  title: overrides.title ?? "Timelog",
  start_time: overrides.start_time ?? "2026-01-01T00:00:00Z",
  end_time: overrides.end_time ?? "2026-01-01T01:00:00Z",
  area_id: overrides.area_id ?? null,
  area_summary: overrides.area_summary ?? null,
  task_id: overrides.task_id ?? null,
  task: overrides.task ?? null,
  tracking_method: overrides.tracking_method ?? "manual",
  energy_level: overrides.energy_level ?? null,
  location: overrides.location ?? null,
  notes: overrides.notes ?? null,
  tags: overrides.tags ?? [],
  person: overrides.person ?? [],
  linked_notes_count: overrides.linked_notes_count ?? 0,
  created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
  deleted_at: overrides.deleted_at ?? null,
});

const areaMap = new Map<UUID, { name: string; color: string }>([
  ["area-a", { name: "Area A", color: "#123456" }],
  ["area-b", { name: "Area B", color: "#654321" }],
]);

describe("useCalendarScheduleController", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const baseParams = {
    startISO: "2026-01-01T00:00:00.000Z",
    endISO: "2026-01-02T00:00:00.000Z",
    showPlannedEvents: true,
    showTimelogs: true,
    selectedAreaId: undefined,
    areaMap,
    taskIndicatorLabel: "task",
    preloadedTasks: [] as Task[],
    visions: [] as Vision[],
    timezone: "UTC",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    plannedEventsFetchRangeMock.mockReset();
    timelogsFetchRangeMock.mockReset();
  });

  it("resolves area colors and area-tinted classes for planned events", async () => {
    plannedEventsFetchRangeMock.mockResolvedValue({
      items: [
        createPlannedEvent({ id: "planned-with-area", area_id: "area-a" }),
        createPlannedEvent({ id: "planned-no-area" }),
        createPlannedEvent({ id: "planned-unknown-area", area_id: "area-x" }),
        createPlannedEvent({ id: "planned-sentinel", area_id: "-1" }),
      ],
    });
    timelogsFetchRangeMock.mockResolvedValue({ items: [] });

    const { result } = renderHook(
      () => useCalendarScheduleController(baseParams),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.scheduleEntries.length).toBeGreaterThan(0),
    );

    const plannedById = (id: string) =>
      result.current.scheduleEntries.find((entry) => entry.id === `planned-${id}`);

    const withArea = plannedById("planned-with-area");
    expect(withArea?.classNames).toContain("area-tinted");
    expect(withArea?.extendedProps?.areaColor).toBe("#123456");
    expect(withArea?.extendedProps?.areaId).toBe("area-a");

    const noArea = plannedById("planned-no-area");
    expect(noArea?.classNames).not.toContain("area-tinted");
    expect(noArea?.extendedProps?.areaColor).toBeNull();

    const unknownArea = plannedById("planned-unknown-area");
    expect(unknownArea?.classNames).toContain("area-tinted");
    expect(unknownArea?.extendedProps?.areaColor).toBe(DEFAULT_AREA_COLOR);

    const sentinel = plannedById("planned-sentinel");
    expect(sentinel?.classNames).toContain("area-tinted");
    expect(sentinel?.extendedProps?.areaColor).toBe(UNKNOWN_AREA_COLOR);
  });

  it("resolves timelog area colors preferring the area summary", async () => {
    plannedEventsFetchRangeMock.mockResolvedValue({ items: [] });
    timelogsFetchRangeMock.mockResolvedValue({
      items: [
        createTimelog({
          id: "timelog-summary",
          area_id: "area-a",
          area_summary: { id: "area-a", name: "Area A", color: "#ABCDEF" },
        }),
        createTimelog({ id: "timelog-map", area_id: "area-b" }),
        createTimelog({ id: "timelog-no-area" }),
      ],
    });

    const { result } = renderHook(
      () => useCalendarScheduleController(baseParams),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.scheduleEntries.length).toBeGreaterThan(0),
    );

    const timelogById = (id: string) =>
      result.current.scheduleEntries.find((entry) =>
        entry.id?.startsWith(`timelog-${id}-`),
      );

    const summary = timelogById("timelog-summary");
    expect(summary?.classNames).toContain("area-tinted");
    expect(summary?.extendedProps?.areaColor).toBe("#ABCDEF");

    const viaMap = timelogById("timelog-map");
    expect(viaMap?.classNames).toContain("area-tinted");
    expect(viaMap?.extendedProps?.areaColor).toBe("#654321");

    const noArea = timelogById("timelog-no-area");
    expect(noArea?.classNames).not.toContain("area-tinted");
    expect(noArea?.extendedProps?.areaColor).toBeNull();
  });
});

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findCachedTimelog,
  invalidateTimelogTaskDependencies,
  mergeTimelogIntoListCaches,
  removeTimelogsFromListCaches,
} from "@/services/api/cacheInvalidation/timelogs";
import {
  tasksKeys,
  timelogsKeys,
  visionsKeys,
} from "@/services/api/queryKeys";
import type { Timelog } from "@/services/api/timelogs";
import type { UUID } from "@/types/primitive";

const dayOne = timelogsKeys.list({
  start: "2025-01-01T00:00:00.000Z",
  end: "2025-01-01T23:59:59.999Z",
});
const dayTwo = timelogsKeys.list({
  start: "2025-01-02T00:00:00.000Z",
  end: "2025-01-02T23:59:59.999Z",
});

const entry = (overrides: Partial<Timelog> = {}): Timelog =>
  ({
    id: "entry-1",
    title: "entry",
    tracking_method: "manual",
    start_time: "2025-01-01T03:00:00Z",
    end_time: "2025-01-01T04:00:00Z",
    area_id: null,
    task_id: null,
    task: null,
    person: [],
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    deleted_at: null,
    linked_notes_count: 0,
    ...overrides,
  }) as Timelog;

describe("timelog list cache helpers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it("merges an entry only into list caches whose window overlaps it", () => {
    const existingOne = entry({
      id: "existing-1" as UUID,
      start_time: "2025-01-01T01:00:00Z",
      end_time: "2025-01-01T02:00:00Z",
    });
    queryClient.setQueryData(dayOne, [existingOne]);
    queryClient.setQueryData(dayTwo, [existingOne]);

    const created = entry({ id: "created-1" as UUID });

    mergeTimelogIntoListCaches(queryClient, created);

    expect(
      (queryClient.getQueryData(dayOne) as Timelog[]).map((item) => item.id),
    ).toEqual(["created-1", "existing-1"]);
    expect(
      (queryClient.getQueryData(dayTwo) as Timelog[]).map((item) => item.id),
    ).toEqual(["existing-1"]);
  });

  it("drops stale copies from windows an updated entry no longer overlaps", () => {
    const moved = entry({ id: "moved-1" as UUID });
    queryClient.setQueryData(dayOne, [moved]);
    queryClient.setQueryData(dayTwo, [moved]);

    mergeTimelogIntoListCaches(queryClient, {
      ...moved,
      start_time: "2025-01-02T03:00:00Z",
      end_time: "2025-01-02T04:00:00Z",
    });

    expect(
      (queryClient.getQueryData(dayOne) as Timelog[]).map((item) => item.id),
    ).toEqual([]);
    expect(
      (queryClient.getQueryData(dayTwo) as Timelog[]).map((item) => item.id),
    ).toEqual(["moved-1"]);
  });

  it("removes entries from all list caches by id", () => {
    const first = entry({ id: "first-1" as UUID });
    const second = entry({ id: "second-1" as UUID });
    queryClient.setQueryData(dayOne, [first, second]);
    queryClient.setQueryData(dayTwo, [second]);

    removeTimelogsFromListCaches(queryClient, ["first-1" as UUID]);

    expect(
      (queryClient.getQueryData(dayOne) as Timelog[]).map((item) => item.id),
    ).toEqual(["second-1"]);
    expect(
      (queryClient.getQueryData(dayTwo) as Timelog[]).map((item) => item.id),
    ).toEqual(["second-1"]);
  });

  it("finds a cached timelog in the detail cache and then list caches", () => {
    const target = entry({ id: "target-1" as UUID });
    queryClient.setQueryData(dayOne, [target]);

    expect(findCachedTimelog(queryClient, "target-1" as UUID)?.id).toBe(
      "target-1",
    );

    queryClient.setQueryData(timelogsKeys.detail("target-1" as UUID), target);
    expect(findCachedTimelog(queryClient, "target-1" as UUID)?.id).toBe(
      "target-1",
    );
    expect(findCachedTimelog(queryClient, "missing-1" as UUID)).toBeUndefined();
  });

  it("invalidates task detail, timelogs and vision hierarchy for tasks", async () => {
    const invalidateSpy = vi
      .spyOn(QueryClient.prototype, "invalidateQueries")
      .mockResolvedValue(undefined);
    const entryWithTask = entry({
      task_id: "task-1" as UUID,
      task: {
        id: "task-1" as UUID,
        vision_id: "vision-1" as UUID,
        content: "task",
      } as Timelog["task"],
    });

    await invalidateTimelogTaskDependencies(queryClient, [entryWithTask]);

    const calledKeys = invalidateSpy.mock.calls
      .map(([options]) => JSON.stringify(options?.queryKey ?? null))
      .filter((key) => key !== "null");
    expect(calledKeys).toContain(
      JSON.stringify(tasksKeys.detail("task-1" as UUID)),
    );
    expect(calledKeys).toContain(
      JSON.stringify(tasksKeys.timelogs("task-1" as UUID)),
    );
    expect(calledKeys).toContain(
      JSON.stringify(visionsKeys.hierarchy("vision-1" as UUID)),
    );

    invalidateSpy.mockRestore();
  });
});

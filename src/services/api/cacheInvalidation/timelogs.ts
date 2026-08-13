import type { QueryClient } from "@tanstack/react-query";

import { tasksKeys, timelogsKeys } from "@/services/api/queryKeys";
import {
  isTimelogsAdvancedSearchQuery,
  isTimelogsListQuery,
  type QueryLike,
} from "@/services/api/queryPredicates";
import type { Timelog } from "@/services/api/timelogs";
import type { UUID } from "@/types/primitive";
import {
  invalidatePlanningSnapshots,
  invalidateTasksByIds,
  type PlanningSnapshot,
} from "@/utils/query";
import { invalidateVisionHierarchy } from "./visions";

type TimelogListFilters = Parameters<typeof timelogsKeys.list>[0];

export const invalidateTimelogLists = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => isTimelogsListQuery(query as QueryLike),
  });

export const invalidateTimelogLatestEndTime = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: timelogsKeys.latestEndTime(),
    exact: true,
  });

export const invalidateTimelogList = (
  queryClient: QueryClient,
  filters: TimelogListFilters,
) =>
  queryClient.invalidateQueries({
    queryKey: timelogsKeys.list(filters),
    exact: true,
  });

export const invalidateTimelogsAdvancedSearch = (
  queryClient: QueryClient,
) =>
  queryClient.invalidateQueries({
    predicate: (query) => isTimelogsAdvancedSearchQuery(query as QueryLike),
  });

export const setTimelogDetailCache = (
  queryClient: QueryClient,
  event: Timelog,
) => {
  queryClient.setQueryData(timelogsKeys.detail(event.id), event);
};

export const removeTimelogDetailCache = (
  queryClient: QueryClient,
  id: UUID,
) => {
  queryClient.removeQueries({
    queryKey: timelogsKeys.detail(id),
    exact: true,
  });
};

const mergeTimelog = <T extends Timelog>(
  existing: T[] | undefined,
  next: T,
): T[] => {
  const list = Array.isArray(existing) ? existing : [];
  const filtered = list.filter((timelog) => timelog.id !== next.id);
  return [next, ...filtered].sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
};

const removeTimelogs = <T extends Timelog>(
  existing: T[] | undefined,
  idsToRemove: Set<UUID>,
): T[] => {
  const list = Array.isArray(existing) ? existing : [];
  if (list.length === 0) return list;
  return list.filter((timelog) => !idsToRemove.has(timelog.id));
};

/**
 * True when the entry overlaps the time window encoded in a list query key.
 * Queries without a window (or with unparseable windows) accept any entry,
 * preserving the previous merge behavior for non-windowed list caches.
 */
const timelogBelongsToWindow = (queryKey: unknown, entry: Timelog): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length < 3) return true;
  const filters = queryKey[2] as { start?: string; end?: string } | undefined;
  if (
    !filters ||
    typeof filters.start !== "string" ||
    typeof filters.end !== "string"
  ) {
    return true;
  }

  const windowStart = Date.parse(filters.start);
  const windowEnd = Date.parse(filters.end);
  if (Number.isNaN(windowStart) || Number.isNaN(windowEnd)) return true;

  const entryStart = Date.parse(entry.start_time);
  const entryEnd = Date.parse(entry.end_time);
  if (Number.isNaN(entryStart) || Number.isNaN(entryEnd)) return false;

  return entryStart < windowEnd && entryEnd > windowStart;
};

/**
 * Merge an entry into every timelog list cache whose window overlaps it, and
 * drop stale copies from windows the entry no longer belongs to (for example
 * after an update moves it to another day).
 */
export const mergeTimelogIntoListCaches = (
  queryClient: QueryClient,
  entry: Timelog,
): void => {
  const queries = queryClient.getQueriesData<unknown>({
    predicate: (query) => isTimelogsListQuery(query as QueryLike),
  });

  queries.forEach(([queryKey, existing]) => {
    const next = timelogBelongsToWindow(queryKey, entry)
      ? mergeTimelog(existing as Timelog[] | undefined, entry)
      : removeTimelogs(existing as Timelog[] | undefined, new Set([entry.id]));
    queryClient.setQueryData(queryKey, next);
  });
};

export const removeTimelogsFromListCaches = (
  queryClient: QueryClient,
  ids: Iterable<UUID>,
): void => {
  const idsToRemove = new Set(ids);
  queryClient.setQueriesData(
    { predicate: (query) => isTimelogsListQuery(query as QueryLike) },
    (existing) =>
      removeTimelogs(existing as Timelog[] | undefined, idsToRemove),
  );
};

/** Look up a timelog in the detail cache, then any list cache. */
export const findCachedTimelog = (
  queryClient: QueryClient,
  timelogId: UUID,
): Timelog | undefined => {
  const detail = queryClient.getQueryData<Timelog>(
    timelogsKeys.detail(timelogId),
  );
  if (detail) return detail;

  const queries = queryClient.getQueriesData<unknown>({
    predicate: (query) => isTimelogsListQuery(query as QueryLike),
  });
  for (const [, existing] of queries) {
    if (!Array.isArray(existing)) continue;
    const found = (existing as Timelog[]).find(
      (timelog) => timelog.id === timelogId,
    );
    if (found) return found;
  }
  return undefined;
};

type TaskDependencySource = {
  task_id?: UUID | null;
  task?: { id?: UUID | null; vision_id?: UUID | null } | null;
} | null
  | undefined;

type CachedTaskSummary = {
  id: UUID;
  vision_id?: UUID | null;
  planning_cycle_type?: string | null;
  planning_cycle_start_date?: string | null;
};

const collectTaskDependencies = (
  queryClient: QueryClient,
  entries: Array<TaskDependencySource>,
): {
  taskIds: UUID[];
  visionIds: UUID[];
  planningSnapshots: Array<PlanningSnapshot | null | undefined>;
} => {
  const taskIds = new Set<UUID>();
  const visionIds = new Set<UUID>();
  const planningSnapshots: Array<PlanningSnapshot | null | undefined> = [];

  entries.forEach((entry) => {
    const taskId = entry?.task_id ?? entry?.task?.id ?? null;
    if (!taskId) return;

    taskIds.add(taskId);
    if (entry?.task?.vision_id) visionIds.add(entry.task.vision_id);

    const cachedTask = queryClient.getQueryData<CachedTaskSummary>(
      tasksKeys.detail(taskId),
    );
    if (cachedTask?.vision_id) visionIds.add(cachedTask.vision_id);
    planningSnapshots.push(cachedTask ?? null);
  });

  return {
    taskIds: Array.from(taskIds),
    visionIds: Array.from(visionIds),
    planningSnapshots,
  };
};

/**
 * Refresh task-related queries after a timelog mutation so effort totals and
 * status updates propagate to the planning/vision pages without invalidating
 * every task query on the network.
 */
export const invalidateTimelogTaskDependencies = async (
  queryClient: QueryClient,
  entries: Array<TaskDependencySource>,
): Promise<void> => {
  const { taskIds, visionIds, planningSnapshots } = collectTaskDependencies(
    queryClient,
    entries,
  );

  const jobs: Array<Promise<unknown>> = [];
  if (taskIds.length > 0) {
    jobs.push(invalidateTasksByIds(queryClient, taskIds));
  }
  visionIds.forEach((visionId) => {
    jobs.push(invalidateVisionHierarchy(queryClient, visionId));
  });
  if (planningSnapshots.length > 0) {
    jobs.push(invalidatePlanningSnapshots(queryClient, planningSnapshots));
  }

  await Promise.all(jobs);
};

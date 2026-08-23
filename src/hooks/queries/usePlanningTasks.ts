import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tasksApi,
  type Task,
  type TaskWithSubtasks,
  toISODate,
} from "@/services/api/tasks";
import { tasksKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";
import {
  toTooltipLookupEntry,
  type TaskTooltipLookupEntry,
} from "@/components/tooltips/tooltipData";
import { logger } from "@/utils/core";

type PlanningCycleType = "7years" | "year" | "month" | "week" | "day";

/**
 * tips 只消费父任务名称等少量字段，补拉数量做上限保护。
 * 批量接口一次请求即可拉回全部父任务（上限与后端 id_in 契约一致）。
 */
const MAX_PARENT_LOOKUP_FETCHES = 100;

function buildTaskHierarchy(flatTasks: Task[]): TaskWithSubtasks[] {
  const taskMap = new Map<UUID, TaskWithSubtasks>();
  const rootTasks: TaskWithSubtasks[] = [];

  flatTasks.forEach((task) => {
    taskMap.set(task.id, {
      ...task,
      subtasks: [],
      completion_percentage: 0,
      depth: 0,
    } as TaskWithSubtasks);
  });

  flatTasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id);
      if (parent) {
        parent.subtasks.push(node);
        node.depth = parent.depth + 1;
      } else {
        rootTasks.push(node);
      }
    } else {
      rootTasks.push(node);
    }
  });

  return rootTasks;
}

function buildTaskLookup(
  flatTasks: Task[],
  extraParents: Task[],
): Map<string, TaskTooltipLookupEntry> {
  const lookup = new Map<string, TaskTooltipLookupEntry>();
  [...flatTasks, ...extraParents].forEach((task) => {
    lookup.set(String(task.id), toTooltipLookupEntry(task));
  });
  return lookup;
}

/**
 * 拉取规划视图任务，并轻量补拉不在结果集中的直接父任务。
 *
 * planning 查询按 planning_cycle_type 过滤，跨周期父任务不在返回集中，
 * 导致任务树中这类任务成为孤立根节点、tips 拿不到父任务数据。
 * 这里只补拉 tips 明确消费的字段（任务名称等），不扩大列表接口的载荷。
 */
async function fetchPlanningTaskSet(
  type: PlanningCycleType,
  selectedDate?: Date,
  size: number = 100,
) {
  const response = await tasksApi.getAll(undefined, undefined, {
    planning_cycle_type: type,
    planning_cycle_start_date: toISODate(selectedDate),
    fields: "full",
    size,
  });
  const tasks = response.items ?? [];
  // filter out deleted if any
  const filtered = tasks.filter(
    (t) =>
      (t as unknown as { deleted_at?: string | null }).deleted_at == null,
  );

  const fetchedIds = new Set(filtered.map((task) => String(task.id)));
  const missingParentIds = Array.from(
    new Set(
      filtered
        .map((task) => task.parent_task_id)
        .filter(
          (parentId): parentId is UUID =>
            parentId != null && !fetchedIds.has(String(parentId)),
        ),
    ),
  ).slice(0, MAX_PARENT_LOOKUP_FETCHES);

  const extraParents: Task[] = [];
  if (missingParentIds.length > 0) {
    try {
      // 后台批量补拉：失败不触发全局错误提示，tips 降级显示无父任务
      const parents = await tasksApi.getByIdsQuiet(missingParentIds);
      extraParents.push(...parents);
    } catch (error) {
      logger.warn(
        `Failed to load ${missingParentIds.length} parent tasks for tooltip:`,
        error,
      );
    }
  }

  return {
    tasks: buildTaskHierarchy(filtered),
    taskLookup: buildTaskLookup(filtered, extraParents),
  };
}

export function usePlanningTasks(
  viewType: PlanningCycleType,
  selectedDate?: Date,
  opts?: {
    limit?: number;
    staleTimeMs?: number;
    gcTimeMs?: number;
    enabled?: boolean;
  },
) {
  const queryClient = useQueryClient();
  const size = opts?.limit ?? 100;
  const staleTime = opts?.staleTimeMs ?? 60 * 1000;
  const gcTime = opts?.gcTimeMs ?? 5 * 60 * 1000;
  const enabled = opts?.enabled ?? true;

  const query = useQuery({
    queryKey: tasksKeys.list({
      planning_cycle_type: viewType,
      planning_cycle_start_date: toISODate(selectedDate),
      fields: "full",
      size,
    }),
    queryFn: async () => {
      return fetchPlanningTaskSet(viewType, selectedDate, size);
    },
    staleTime,
    gcTime,
    enabled,
  });

  const prefetch = useCallback(
    (type: PlanningCycleType, prefetchDate?: Date) => {
      return queryClient.prefetchQuery({
        queryKey: tasksKeys.list({
          planning_cycle_type: type,
          planning_cycle_start_date: toISODate(prefetchDate),
          fields: "full",
          size,
        }),
        queryFn: async () => {
          return fetchPlanningTaskSet(type, prefetchDate, size);
        },
        staleTime,
        gcTime,
      });
    },
    [
      gcTime,
      queryClient,
      size,
      staleTime,
    ],
  );

  return {
    tasks: (query.data?.tasks as TaskWithSubtasks[] | undefined) ?? [],
    taskLookup: query.data?.taskLookup ?? new Map(),
    query,
    prefetch,
  };
}

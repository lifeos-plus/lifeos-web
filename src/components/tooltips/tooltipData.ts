import type { UUID } from "@/types/primitive";

/**
 * 归一化的任务 tips 数据。
 *
 * 只包含 tips 明确渲染的字段；调用方负责从已加载的客户端数据
 * （任务列表、愿景列表）解析出这些值，避免为 tips 扩大 API 载荷。
 */
export interface TaskTooltipData {
  content: string | null;
  status: string | null;
  priority: number | null;
  planningCycleType: string | null;
  planningCycleStartDate: string | null;
  actualEffortTotal: number | null;
  actualEffortSelf: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  visionName: string | null;
  parentContent: string | null;
}

/**
 * 可被解析的任务来源。兼容任务列表、任务摘要（TaskSummary）、
 * 以及时间日志内嵌的任务摘要三种形状。
 */
export interface TaskTooltipSource {
  id?: UUID | string | null;
  content?: string | null;
  status?: string | null;
  priority?: number | null;
  planning_cycle_type?: string | null;
  planning_cycle_start_date?: string | null;
  actual_effort_total?: number | null;
  actual_effort_self?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  vision_id?: UUID | string | null;
  parent_task_id?: UUID | string | null;
  vision_summary?: { name?: string | null } | null;
  parent_summary?: { content?: string | null } | null;
}

/**
 * tips 解析所需的客户端查找表条目。仅存储 tips 消费的字段。
 */
export interface TaskTooltipLookupEntry extends TaskTooltipSource {
  id: UUID | string;
}

export interface TooltipLookups {
  visionMap?: ReadonlyMap<string, { name?: string | null }> | null;
  taskMap?: ReadonlyMap<string, TaskTooltipLookupEntry> | null;
}

interface LookupInputTask {
  id: UUID | string;
  content?: string | null;
  status?: string | null;
  priority?: number | null;
  planning_cycle_type?: string | null;
  planning_cycle_start_date?: string | null;
  actual_effort_total?: number | null;
  actual_effort_self?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  vision_id?: UUID | string | null;
  parent_task_id?: UUID | string | null;
  subtasks?: readonly LookupInputTask[] | null;
}

export interface BuildTooltipLookupsOptions {
  visions?: readonly { id: UUID | string; name?: string | null }[] | null;
  tasks?: readonly LookupInputTask[] | null;
  /**
   * 外部补充的任务查找表（例如 planning 页为跨周期父任务补拉的数据），
   * 会覆盖从 tasks 构建的同 id 条目。
   */
  taskOverrides?: ReadonlyMap<string, TaskTooltipLookupEntry> | null;
}

function toKey(value: UUID | string | null | undefined): string | null {
  return value == null || value === "" ? null : String(value);
}

function collectLookupTasks(
  tasks: readonly LookupInputTask[] | null | undefined,
  target: Map<string, TaskTooltipLookupEntry>,
) {
  if (!tasks) return;
  tasks.forEach((task) => {
    const key = toKey(task.id);
    if (key) {
      target.set(key, toTooltipLookupEntry(task));
    }
    if (task.subtasks?.length) {
      collectLookupTasks(task.subtasks, target);
    }
  });
}

export function buildTooltipLookups(
  options: BuildTooltipLookupsOptions = {},
): TooltipLookups {
  const visionMap = new Map<string, { name?: string | null }>();
  options.visions?.forEach((vision) => {
    const key = toKey(vision.id);
    if (key) visionMap.set(key, { name: vision.name ?? null });
  });

  const taskMap = new Map<string, TaskTooltipLookupEntry>();
  collectLookupTasks(options.tasks, taskMap);
  options.taskOverrides?.forEach((entry, key) => {
    taskMap.set(key, entry);
  });

  return { visionMap, taskMap };
}

/**
 * 从任意任务形状解析 tips 需要的归一化数据。
 *
 * 解析优先级：
 * 1. 来源字段自身（例如完整任务或任务摘要中的字段）；
 * 2. taskMap 中同 id 的完整任务记录（来源缺失时补足，例如摘要缺 priority）；
 * 3. 愿景名/父任务名通过 visionMap / taskMap 按 id 解析。
 */
export function resolveTaskTooltipData(
  source: TaskTooltipSource | null | undefined,
  lookups: TooltipLookups = {},
): TaskTooltipData | null {
  if (!source) return null;

  const sourceIdKey = toKey(source.id);
  const fullEntry = sourceIdKey ? lookups.taskMap?.get(sourceIdKey) : undefined;

  const visionId = toKey(source.vision_id ?? fullEntry?.vision_id);
  const parentTaskId = toKey(
    source.parent_task_id ?? fullEntry?.parent_task_id,
  );

  const visionName =
    source.vision_summary?.name ??
    (visionId ? lookups.visionMap?.get(visionId)?.name ?? null : null) ??
    null;

  const parentContent =
    source.parent_summary?.content ??
    (parentTaskId
      ? lookups.taskMap?.get(parentTaskId)?.content ?? null
      : null) ??
    null;

  return {
    content: source.content ?? fullEntry?.content ?? null,
    status: source.status ?? fullEntry?.status ?? null,
    priority: source.priority ?? fullEntry?.priority ?? null,
    planningCycleType:
      source.planning_cycle_type ?? fullEntry?.planning_cycle_type ?? null,
    planningCycleStartDate:
      source.planning_cycle_start_date ??
      fullEntry?.planning_cycle_start_date ??
      null,
    actualEffortTotal:
      source.actual_effort_total ?? fullEntry?.actual_effort_total ?? null,
    actualEffortSelf:
      source.actual_effort_self ?? fullEntry?.actual_effort_self ?? null,
    createdAt: source.created_at ?? fullEntry?.created_at ?? null,
    updatedAt: source.updated_at ?? fullEntry?.updated_at ?? null,
    visionName,
    parentContent,
  };
}

/** 仅保留 tips 消费的字段，构建一条轻量任务查找表条目。 */
export function toTooltipLookupEntry(
  task: LookupInputTask,
): TaskTooltipLookupEntry {
  return {
    id: task.id,
    content: task.content ?? null,
    status: task.status ?? null,
    priority: task.priority ?? null,
    planning_cycle_type: task.planning_cycle_type ?? null,
    planning_cycle_start_date: task.planning_cycle_start_date ?? null,
    actual_effort_total: task.actual_effort_total ?? null,
    actual_effort_self: task.actual_effort_self ?? null,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
    vision_id: task.vision_id ?? null,
    parent_task_id: task.parent_task_id ?? null,
  };
}

import type { Task, TaskWithSubtasks } from "@/services/api/tasks";
import {
  toTooltipLookupEntry,
  type TaskTooltipLookupEntry,
} from "@/components/tooltips/tooltipData";
import type { UUID } from "@/types/primitive";

export interface PlanningQueryData {
  tasks: TaskWithSubtasks[];
  taskLookup: Map<string, TaskTooltipLookupEntry>;
}

export function buildTaskHierarchy(flatTasks: Task[]): TaskWithSubtasks[] {
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

export function buildTaskLookup(
  flatTasks: Task[],
  extraParents: Task[],
): Map<string, TaskTooltipLookupEntry> {
  const lookup = new Map<string, TaskTooltipLookupEntry>();
  [...flatTasks, ...extraParents].forEach((task) => {
    lookup.set(String(task.id), toTooltipLookupEntry(task));
  });
  return lookup;
}

function flattenPlanningTree(tasks: TaskWithSubtasks[]): Task[] {
  const flat: Task[] = [];
  const visit = (node: TaskWithSubtasks): void => {
    flat.push(node as unknown as Task);
    node.subtasks.forEach(visit);
  };
  tasks.forEach(visit);
  return flat;
}

/**
 * Apply a single task mutation to cached planning data.
 *
 * The planning cache stores a built tree plus a tooltip lookup that may hold
 * cross-cycle parents. A naive field patch cannot keep either shape correct
 * (tree nesting and lookup entries both need rebuilding), so this helper
 * re-flattens, merges the updated task, and rebuilds both structures.
 */
export function updatePlanningQueryData(
  data: PlanningQueryData,
  task: Task,
): PlanningQueryData | null {
  const flat = flattenPlanningTree(data.tasks);
  const flatIds = new Set(flat.map((item) => String(item.id)));
  const lookupEntries = Array.from(data.taskLookup.values());
  const matchesFlat = flatIds.has(String(task.id));
  const matchesLookup = lookupEntries.some(
    (entry) => String(entry.id) === String(task.id),
  );
  if (!matchesFlat && !matchesLookup) {
    return null;
  }

  const nextFlat = flat.map((item) =>
    String(item.id) === String(task.id) ? { ...item, ...task } : item,
  );

  const nextLookup = new Map<string, TaskTooltipLookupEntry>();
  nextFlat.forEach((item) => {
    nextLookup.set(String(item.id), toTooltipLookupEntry(item));
  });
  lookupEntries.forEach((entry) => {
    const key = String(entry.id);
    if (nextLookup.has(key)) return;
    nextLookup.set(
      key,
      String(entry.id) === String(task.id)
        ? { ...entry, ...task }
        : entry,
    );
  });

  return {
    tasks: buildTaskHierarchy(nextFlat),
    taskLookup: nextLookup,
  };
}

import type { QueryClient } from "@tanstack/react-query";

import { visionsKeys } from "@/services/api/queryKeys";
import {
  isVisionsHierarchyQuery,
  isVisionsListQuery,
  type QueryLike,
} from "@/services/api/queryPredicates";
import type { UUID } from "@/types/primitive";
import type {
  Task,
  TaskWithSubtasks,
  TaskHierarchy,
} from "@/services/api/tasks";

export const invalidateVisionsLists = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => isVisionsListQuery(query as QueryLike),
  });

export const invalidateVisionHierarchy = (
  queryClient: QueryClient,
  visionId: UUID,
) =>
  queryClient.invalidateQueries({
    queryKey: visionsKeys.hierarchy(visionId),
  });

export const invalidateAllVisionHierarchies = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => isVisionsHierarchyQuery(query as QueryLike),
  });

// 乐观更新hierarchy缓存
export const addTaskToHierarchyCache = (
  queryClient: QueryClient,
  visionId: UUID,
  newTask: Task,
) => {
  const hierarchyKey = visionsKeys.hierarchy(visionId);
  queryClient.setQueriesData(
    { queryKey: hierarchyKey },
    (oldData: TaskHierarchy | undefined): TaskHierarchy => {
      if (!oldData) {
        return {
          vision_id: visionId,
          root_tasks: [newTask as TaskWithSubtasks],
        };
      }

      const taskWithSubtasks: TaskWithSubtasks = {
        ...newTask,
        subtasks: [],
        completion_percentage: 0,
        depth: 0,
      };

      if (!newTask.parent_task_id) {
        return {
          ...oldData,
          root_tasks: [...oldData.root_tasks, taskWithSubtasks],
        };
      }

      const addToParent = (
        tasks: TaskWithSubtasks[],
        parentId: UUID,
      ): TaskWithSubtasks[] => {
        return tasks.map((task) => {
          if (task.id === parentId) {
            return {
              ...task,
              subtasks: [...task.subtasks, taskWithSubtasks],
            };
          }
          if (task.subtasks.length > 0) {
            return {
              ...task,
              subtasks: addToParent(task.subtasks, parentId),
            };
          }
          return task;
        });
      };

      return {
        ...oldData,
        root_tasks: addToParent(oldData.root_tasks, newTask.parent_task_id),
      };
    },
  );
};

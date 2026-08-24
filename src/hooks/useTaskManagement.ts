import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskWithSubtasks, Vision } from "@/services/api";
import type { Timelog } from "@/services/api/timelogs";
import { tasksApi } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import type { UUID } from "@/types/primitive";
import {
  invalidateTasksByIds,
  updateTaskCaches,
  updateTaskRelationshipCounts,
} from "@/utils/query";
import { tasksKeys } from "@/services/api/queryKeys";
import { createModalSessionId } from "@/utils/session";
import {
  collectOpenSubtasks,
  hasBlockingDirectSubtasks,
  isParentCompletionBlockedError,
} from "@/utils/taskStatus";

type TaskUpdateSummary = {
  id: UUID;
  vision_id: UUID | null;
  parent_task_id: UUID | null;
} & Partial<Omit<Task, "id" | "vision_id" | "parent_task_id">>;

interface TaskMutationResultPayload {
  updatedTask?: TaskUpdateSummary;
  structureChanged?: boolean;
  visionChanged?: boolean;
  parentTaskStatusChanged?: {
    taskId: UUID;
    oldStatus: string;
    newStatus: string;
  };
  visionIdHint?: UUID | null;
}

interface TaskSaveResult {
  updatedTask?: TaskUpdateSummary;
  structureChanged?: boolean;
  visionChanged?: boolean;
  parentTaskStatusChanged?: {
    taskId: UUID;
    oldStatus: string;
    newStatus: string;
  };
  sessionId?: string;
}

export interface TaskManagementConfig {
  onTaskUpdate?: () => void;
  onNoteCreated?: () => void; // 创建笔记后的回调（默认不刷新，由调用方决定）
  visionId?: UUID;
  allVisions?: Vision[];
  allTasks?: TaskWithSubtasks[]; // 所有任务列表，用于父任务选择
  // VisionManager 特殊需求
  onTaskUpdateWithVisionId?: (visionId: UUID) => void;
  getFlattenedTasks?: (tasks: TaskWithSubtasks[]) => TaskWithSubtasks[];
  onTaskAttributesUpdate?: (task: TaskUpdateSummary) => void;
  onTaskStructureChange?: (
    payload: TaskMutationResultPayload & {
      previousVisionId: UUID | null;
    },
  ) => void;
}

interface TaskManagementState {
  // 编辑相关状态
  editingTask: TaskWithSubtasks | null;
  isEditModalOpen: boolean;
  editModalSessionId: string | null;

  // 删除相关状态
  deletingTask: TaskWithSubtasks | null;
  isDeleteConfirmOpen: boolean;

  // 时间记录相关状态
  viewingTimeRecords: TaskWithSubtasks | null;
  isTimeRecordsModalOpen: boolean;

  // 笔记相关状态
  viewingNotes: TaskWithSubtasks | null;
  isNotesModalOpen: boolean;

  // 创建笔记相关状态
  creatingNoteForTask: TaskWithSubtasks | null;
  isCreateNoteModalOpen: boolean;

  // Timelog creation state
  creatingTimelogForTask: TaskWithSubtasks | null;
  isCreateTimelogModalOpen: boolean;

  // 创建子任务相关状态
  creatingSubtask: boolean;
  parentTaskId: UUID | null;

  // 状态级联确认相关状态
  statusCascade: {
    task: TaskWithSubtasks;
    newStatus: string;
    affectedSubtasks: TaskWithSubtasks[];
  } | null;
}

interface TaskManagementActions {
  // 任务编辑
  handleEditTask: (task: TaskWithSubtasks) => void;
  handleTaskSave: (result?: TaskSaveResult) => void;
  closeEditModal: (context?: { sessionId?: string }) => void;

  // 任务删除
  handleDeleteTask: (task: TaskWithSubtasks) => void;
  confirmDeleteTask: () => void;
  closeDeleteConfirm: () => void;

  // 状态更新
  handleStatusUpdate: (
    task: TaskWithSubtasks,
    newStatus: string,
  ) => Promise<void>;
  closeStatusCascade: () => void;
  confirmStatusCascade: () => void;

  // 添加子任务
  handleAddSubtask: (parentId?: UUID | null) => void;

  // 查看时间记录
  handleViewTimeRecords: (task: TaskWithSubtasks) => void;
  closeTimeRecordsModal: () => void;

  // 查看笔记
  handleViewNotes: (task: TaskWithSubtasks) => void;
  closeNotesModal: () => void;

  // 创建笔记
  handleOpenCreateNoteModal: (task: TaskWithSubtasks) => void;
  closeCreateNoteModal: () => void;
  handleNoteCreated: () => void;

  // Timelog creation
  handleOpenCreateTimelogModal: (task: TaskWithSubtasks) => void;
  closeCreateTimelogModal: () => void;
  handleTimelogCreated: (result: Timelog) => void;

  // 任务重排序
  handleTasksReorder: (reorderedTasks: TaskWithSubtasks[]) => Promise<void>;
}

/**
 * 通用的任务管理 hook
 *
 * 提供任务编辑、删除、状态更新、添加子任务、查看时间记录、重排序等功能
 * 可以在不同的组件中复用，避免代码重复
 */
export const useTaskManagement = (config: TaskManagementConfig = {}) => {
  const {
    onTaskUpdate,
    onNoteCreated,
    visionId,
    allVisions: _allVisions = [],
    allTasks = [],
    onTaskUpdateWithVisionId,
    getFlattenedTasks: _getFlattenedTasks,
    onTaskAttributesUpdate,
    onTaskStructureChange,
  } = config;
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const triggerAttributesUpdate = useCallback(
    (task: TaskUpdateSummary) => {
      if (onTaskAttributesUpdate) {
        onTaskAttributesUpdate(task);
        return;
      }
      if (onTaskUpdateWithVisionId && visionId) {
        onTaskUpdateWithVisionId(visionId);
        return;
      }
      onTaskUpdate?.();
    },
    [onTaskAttributesUpdate, onTaskUpdateWithVisionId, visionId, onTaskUpdate],
  );

  const triggerStructureChange = useCallback(
    (
      payload: TaskMutationResultPayload & { previousVisionId: UUID | null },
    ) => {
      let handled = false;
      if (onTaskStructureChange) {
        onTaskStructureChange(payload);
        handled = true;
      }
      if (onTaskUpdateWithVisionId && visionId) {
        onTaskUpdateWithVisionId(visionId);
        handled = true;
      }
      if (!handled) {
        onTaskUpdate?.();
      }
    },
    [onTaskStructureChange, onTaskUpdateWithVisionId, visionId, onTaskUpdate],
  );

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: UUID) => tasksApi.delete(taskId),
    onSuccess: async (_, taskId) => {
      toast.showSuccess(
        t("task.messages.deleteSuccess"),
        t("task.messages.deleteSuccessDetail"),
      );
      if (onTaskUpdateWithVisionId && visionId) {
        onTaskUpdateWithVisionId(visionId);
      } else {
        onTaskUpdate?.();
      }
      queryClient.removeQueries({
        queryKey: tasksKeys.detail(taskId),
        exact: true,
      });
      await invalidateTasksByIds(queryClient, [taskId], { skipEvents: true });
    },
    onError: (error: Error) => {
      toast.showError(
        t("task.messages.deleteFailed"),
        t("task.messages.deleteFailedDetail"),
      );
      console.error("Delete task error:", error);
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
      applyToSubtasks,
    }: {
      taskId: UUID;
      status: string;
      applyToSubtasks?: boolean;
    }) => tasksApi.updateStatus(taskId, status, { applyToSubtasks }),
    onSuccess: async (updatedTask: Task) => {
      toast.showSuccess(
        t("task.messages.statusUpdateSuccess"),
        t("task.messages.statusUpdateSuccessDetail"),
      );
      const normalizedTask: TaskUpdateSummary = {
        ...updatedTask,
        parent_task_id: updatedTask.parent_task_id ?? null,
      };
      triggerAttributesUpdate(normalizedTask);
      updateTaskCaches(queryClient, updatedTask);
      await invalidateTasksByIds(queryClient, [updatedTask.id], {
        skipEvents: true,
      });
    },
    onError: (error: Error) => {
      toast.showError(
        t("task.messages.statusUpdateFailed"),
        isParentCompletionBlockedError(error)
          ? t("taskManagement.statusCascade.blockedError")
          : t("task.messages.statusUpdateFailedDetail"),
      );
      console.error("Update task status error:", error);
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: (taskOrders: Array<{ id: UUID; display_order: number }>) =>
      tasksApi.reorder(taskOrders),
    onSuccess: async (_result, taskOrders) => {
      toast.showSuccess(
        t("task.messages.orderUpdateSuccess"),
        t("task.messages.orderUpdateSuccessDetail"),
      );
      if (onTaskUpdateWithVisionId && visionId) {
        onTaskUpdateWithVisionId(visionId);
      } else {
        onTaskUpdate?.();
      }
      const reorderedIds = taskOrders.map((order) => order.id);
      if (reorderedIds.length > 0) {
        await invalidateTasksByIds(queryClient, reorderedIds, {
          skipEvents: true,
        });
      }
    },
    onError: (error: Error) => {
      toast.showError(
        t("task.messages.orderUpdateFailed"),
        t("task.messages.orderUpdateFailedDetail"),
      );
      console.error("Reorder tasks error:", error);
    },
  });

  const [state, setState] = useState<TaskManagementState>({
    editingTask: null,
    isEditModalOpen: false,
    editModalSessionId: null,
    deletingTask: null,
    isDeleteConfirmOpen: false,
    viewingTimeRecords: null,
    isTimeRecordsModalOpen: false,
    viewingNotes: null,
    isNotesModalOpen: false,
    creatingNoteForTask: null,
    isCreateNoteModalOpen: false,
    creatingTimelogForTask: null,
    isCreateTimelogModalOpen: false,
    creatingSubtask: false,
    parentTaskId: null,
    statusCascade: null,
  });

  const handleEditTask = useCallback((task: TaskWithSubtasks) => {
    const sessionId = createModalSessionId();
    setState((prev) => ({
      ...prev,
      editingTask: task,
      isEditModalOpen: true,
      creatingSubtask: false,
      parentTaskId: null,
      editModalSessionId: sessionId,
    }));
  }, []);

  const handleTaskSave = useCallback(
    (result?: TaskSaveResult) => {
      if (
        state.editModalSessionId &&
        result?.sessionId &&
        result.sessionId !== state.editModalSessionId
      ) {
        return;
      }

      const previousVisionId = state.editingTask?.vision_id ?? visionId ?? null;

      setState((prev) => ({
        ...prev,
        isEditModalOpen: false,
        editingTask: null,
        creatingSubtask: false,
        parentTaskId: null,
        editModalSessionId: null,
      }));

      if (!result) {
        return;
      }

      if (result.structureChanged || result.visionChanged) {
        const payload: TaskMutationResultPayload & {
          previousVisionId: UUID | null;
        } = {
          updatedTask: result.updatedTask
            ? {
                ...result.updatedTask,
                vision_id: result.updatedTask.vision_id ?? previousVisionId,
                parent_task_id: result.updatedTask.parent_task_id ?? null,
              }
            : undefined,
          structureChanged: result.structureChanged,
          visionChanged: result.visionChanged,
          parentTaskStatusChanged: result.parentTaskStatusChanged,
          previousVisionId,
          visionIdHint:
            result.updatedTask?.vision_id ??
            visionId ??
            previousVisionId ??
            null,
        };
        triggerStructureChange(payload);
        return;
      }

      if (result.updatedTask) {
        const normalizedTask: TaskUpdateSummary = {
          ...result.updatedTask,
          vision_id: result.updatedTask.vision_id ?? previousVisionId,
          parent_task_id: result.updatedTask.parent_task_id ?? null,
        };
        triggerAttributesUpdate(normalizedTask);
      }
    },
    [state, visionId, triggerStructureChange, triggerAttributesUpdate],
  );

  const closeEditModal = useCallback((context?: { sessionId?: string }) => {
    setState((prev) => {
      if (
        prev.editModalSessionId &&
        context?.sessionId &&
        context.sessionId !== prev.editModalSessionId
      ) {
        return prev;
      }

      return {
        ...prev,
        isEditModalOpen: false,
        editingTask: null,
        creatingSubtask: false,
        parentTaskId: null,
        editModalSessionId: null,
      };
    });
  }, []);

  const handleDeleteTask = useCallback((task: TaskWithSubtasks) => {
    setState((prev) => ({
      ...prev,
      deletingTask: task,
      isDeleteConfirmOpen: true,
    }));
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (!state.deletingTask) return;

    const taskId = state.deletingTask.id;

    setState((prev) => ({
      ...prev,
      isDeleteConfirmOpen: false,
      deletingTask: null,
    }));

    deleteTaskMutation.mutate(taskId);
  }, [state.deletingTask, deleteTaskMutation]);

  const closeDeleteConfirm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDeleteConfirmOpen: false,
      deletingTask: null,
    }));
  }, []);

  // 应用状态更新（保留滚动位置和焦点）
  const applyStatusUpdate = useCallback(
    (taskId: UUID, status: string, applyToSubtasks: boolean) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const activeElementRole = activeElement?.getAttribute("role");
      const shouldRestoreFocus =
        Boolean(activeElement) &&
        activeElement !== document.body &&
        activeElementRole !== "combobox";
      const savedPosition = {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        activeElement: shouldRestoreFocus ? activeElement : null,
      };

      updateTaskStatusMutation.mutate(
        { taskId, status, applyToSubtasks },
        {
          onSuccess: () => {
            requestAnimationFrame(() => {
              window.scrollTo(savedPosition.scrollX, savedPosition.scrollY);
              if (savedPosition.activeElement?.focus) {
                savedPosition.activeElement.focus();
              }
            });
          },
        },
      );
    },
    [updateTaskStatusMutation],
  );

  // 状态更新处理：done 且存在未闭合直接子任务时先做二次确认
  const handleStatusUpdate = useCallback(
    async (task: TaskWithSubtasks, newStatus: string) => {
      if (
        newStatus === "done" &&
        task.status !== "done" &&
        hasBlockingDirectSubtasks(task)
      ) {
        let fullTask = task;
        try {
          fullTask = await tasksApi.getWithSubtasks(task.id);
        } catch (error) {
          // 规划页可能只加载了部分子任务；拉取失败时回退到本地树，
          // 后端校验仍然是最终防线。
          console.warn("Failed to load full task subtree for status cascade:", error);
        }
        const affectedSubtasks = collectOpenSubtasks(fullTask);
        if (affectedSubtasks.length > 0) {
          setState((prev) => ({
            ...prev,
            statusCascade: {
              task: fullTask,
              newStatus,
              affectedSubtasks,
            },
          }));
          return;
        }
      }
      applyStatusUpdate(task.id, newStatus, false);
    },
    [applyStatusUpdate],
  );

  const closeStatusCascade = useCallback(() => {
    setState((prev) => ({ ...prev, statusCascade: null }));
  }, []);

  // 确认级联：把父任务状态应用到未闭合子任务
  const confirmStatusCascade = useCallback(() => {
    const pending = state.statusCascade;
    if (!pending) return;
    setState((prev) => ({ ...prev, statusCascade: null }));
    applyStatusUpdate(pending.task.id, pending.newStatus, true);
  }, [state.statusCascade, applyStatusUpdate]);

  const handleAddSubtask = useCallback(
    (parentId?: UUID | null) => {
      const sessionId = createModalSessionId();
      if (!parentId) {
        // Allow creating a brand-new root task when no parent is provided
        setState((prev) => ({
          ...prev,
          editingTask: null,
          isEditModalOpen: true,
          creatingSubtask: false,
          parentTaskId: null,
          editModalSessionId: sessionId,
        }));
        return;
      }

      const parentTask = allTasks.find((task) => task.id === parentId);
      if (parentTask) {
        // 对于新任务，我们不创建完整的 TaskWithSubtasks 对象
        // 而是使用 null 来表示新任务，让 TaskEditModal 处理
        setState((prev) => ({
          ...prev,
          editingTask: null,
          isEditModalOpen: true,
          creatingSubtask: true,
          parentTaskId: parentId,
          editModalSessionId: sessionId,
        }));
        return;
      }

      console.warn(
        `[useTaskManagement] Parent task ${parentId} not found. Falling back to root task creation.`,
      );
      setState((prev) => ({
        ...prev,
        editingTask: null,
        isEditModalOpen: true,
        creatingSubtask: false,
        parentTaskId: null,
        editModalSessionId: sessionId,
      }));
    },
    [allTasks],
  );

  const handleViewTimeRecords = useCallback((task: TaskWithSubtasks) => {
    setState((prev) => ({
      ...prev,
      viewingTimeRecords: task,
      isTimeRecordsModalOpen: true,
    }));
  }, []);

  const closeTimeRecordsModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTimeRecordsModalOpen: false,
      viewingTimeRecords: null,
    }));
  }, []);

  const handleViewNotes = useCallback((task: TaskWithSubtasks) => {
    setState((prev) => ({
      ...prev,
      viewingNotes: task,
      isNotesModalOpen: true,
    }));
  }, []);

  const closeNotesModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isNotesModalOpen: false,
      viewingNotes: null,
    }));
  }, []);

  const handleOpenCreateNoteModal = useCallback((task: TaskWithSubtasks) => {
    setState((prev) => ({
      ...prev,
      creatingNoteForTask: task,
      isCreateNoteModalOpen: true,
    }));
  }, []);

  // 仅关闭创建笔记模态框（不刷新）
  const closeCreateNoteModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateNoteModalOpen: false,
      creatingNoteForTask: null,
    }));
  }, []);

  // 笔记成功创建：关闭并回调（默认不触发全局刷新）
  const handleNoteCreated = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateNoteModalOpen: false,
      creatingNoteForTask: null,
    }));
    if (onNoteCreated) {
      onNoteCreated();
    }
  }, [onNoteCreated]);

  const handleOpenCreateTimelogModal = useCallback((task: TaskWithSubtasks) => {
    setState((prev) => ({
      ...prev,
      creatingTimelogForTask: task,
      isCreateTimelogModalOpen: true,
    }));
  }, []);

  const closeCreateTimelogModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateTimelogModalOpen: false,
      creatingTimelogForTask: null,
    }));
  }, []);

  const handleTimelogCreated = useCallback(
    (result: Timelog) => {
      const taskId =
        result.task?.id ??
        result.task_id ??
        state.creatingTimelogForTask?.id ??
        null;

      setState((prev) => ({
        ...prev,
        isCreateTimelogModalOpen: false,
        creatingTimelogForTask: null,
      }));

      if (!taskId) {
        onTaskUpdate?.();
        return;
      }

      updateTaskRelationshipCounts(queryClient, taskId, {
        timelogs_count: (current) => Math.max(1, current + 1),
      });

      void invalidateTasksByIds(queryClient, [taskId]).catch((error) => {
        console.warn("Failed to refresh task after creating timelog:", error);
      });
      onTaskUpdate?.();
    },
    [onTaskUpdate, queryClient, state.creatingTimelogForTask?.id],
  );

  const handleTasksReorder = useCallback(
    async (reorderedTasks: TaskWithSubtasks[]) => {
      // Empty payload indicates cross-level moves from DraggableTaskList; force a full refresh
      if (reorderedTasks.length === 0) {
        triggerStructureChange({
          updatedTask: undefined,
          structureChanged: true,
          visionChanged: false,
          previousVisionId: visionId ?? null,
          visionIdHint: visionId ?? null,
        });
        return;
      }

      const taskOrders = reorderedTasks.map((task, index) => ({
        id: task.id,
        display_order: index,
      }));
      reorderTasksMutation.mutate(taskOrders);
    },
    [reorderTasksMutation, triggerStructureChange, visionId],
  );

  const actions: TaskManagementActions = {
    handleEditTask,
    handleTaskSave,
    closeEditModal,
    handleDeleteTask,
    confirmDeleteTask,
    closeDeleteConfirm,
    handleStatusUpdate,
    closeStatusCascade,
    confirmStatusCascade,
    handleAddSubtask,
    handleViewTimeRecords,
    closeTimeRecordsModal,
    handleViewNotes,
    closeNotesModal,
    handleOpenCreateNoteModal,
    closeCreateNoteModal,
    handleNoteCreated,
    handleOpenCreateTimelogModal,
    closeCreateTimelogModal,
    handleTimelogCreated,
    handleTasksReorder,
  };

  return {
    state,
    actions,
    // 便捷的状态访问
    editingTask: state.editingTask,
    isEditModalOpen: state.isEditModalOpen,
    editModalSessionId: state.editModalSessionId,
    deletingTask: state.deletingTask,
    isDeleteConfirmOpen: state.isDeleteConfirmOpen,
    viewingTimeRecords: state.viewingTimeRecords,
    isTimeRecordsModalOpen: state.isTimeRecordsModalOpen,
    viewingNotes: state.viewingNotes,
    isNotesModalOpen: state.isNotesModalOpen,
    creatingNoteForTask: state.creatingNoteForTask,
    isCreateNoteModalOpen: state.isCreateNoteModalOpen,
    creatingTimelogForTask: state.creatingTimelogForTask,
    isCreateTimelogModalOpen: state.isCreateTimelogModalOpen,
    creatingSubtask: state.creatingSubtask,
    parentTaskId: state.parentTaskId,
    statusCascade: state.statusCascade,
  };
};

export type { TaskUpdateSummary, TaskMutationResultPayload };

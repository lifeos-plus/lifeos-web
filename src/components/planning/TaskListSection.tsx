import React from "react";
import { useTranslation } from "react-i18next";
import Card from "@/layouts/Card";
import EmptyState from "@/components/EmptyState";
import { Icon } from "@/components/icons";
import TaskManagementWrapper from "@/components/TaskManagementWrapper";
import DraggableTaskList from "@/components/DraggableTaskList";
import type { TaskWithSubtasks, Vision } from "@/services/api";
import { TASK_STATUS_LABELS } from "@/utils/constants";
import type { UUID } from "@/types/primitive";
import type { TaskTooltipLookupEntry } from "@/components/tooltips/tooltipData";

interface TaskListSectionProps {
  groupId: string;
  visions: Vision[];
  taskLookup?: ReadonlyMap<string, TaskTooltipLookupEntry> | null;
  filteredTasks: TaskWithSubtasks[];
  sortedTasks: TaskWithSubtasks[];
  statusFilter: string;
  visionFilter: string;
  selectedVisionFilterName: string;
  onTaskUpdate?: () => void;
  getExpandedTasks: (groupId: string) => Set<UUID>;
  toggleTaskExpansion: (groupId: string, taskId: string) => void;
}

export const TaskListSection: React.FC<TaskListSectionProps> = ({
  groupId,
  visions,
  taskLookup,
  filteredTasks,
  sortedTasks,
  statusFilter,
  visionFilter,
  selectedVisionFilterName,
  onTaskUpdate,
  getExpandedTasks,
  toggleTaskExpansion,
}) => {
  const { t } = useTranslation();

  if (filteredTasks.length === 0) {
    const statusLabel =
      TASK_STATUS_LABELS[statusFilter as keyof typeof TASK_STATUS_LABELS] ??
      statusFilter;

    let emptyMessage: string;
    if (statusFilter === "all" && visionFilter === "all") {
      emptyMessage = t("planning.taskList.emptyMessage.noTasks");
    } else if (statusFilter !== "all" && visionFilter === "all") {
      emptyMessage = t("planning.taskList.emptyMessage.noTasksWithStatus", {
        status: statusLabel,
      });
    } else if (statusFilter === "all" && visionFilter !== "all") {
      emptyMessage = t("planning.taskList.emptyMessage.noTasksWithVision", {
        vision: selectedVisionFilterName,
      });
    } else {
      emptyMessage = t(
        "planning.taskList.emptyMessage.noTasksWithStatusAndVision",
        {
          status: statusLabel,
          vision: selectedVisionFilterName,
        },
      );
    }

    return (
      <Card
        title={t("planning.taskList.title")}
        size="md"
        elevation="moderate"
        className="mb-4"
      >
        <EmptyState
          icon={<Icon name="document-text" size={48} aria-hidden />}
          title={t("planning.taskList.emptyMessage.noTasks")}
          description={emptyMessage}
          className="py-4"
        />
      </Card>
    );
  }

  return (
    <Card
      title={t("planning.taskList.title")}
      size="md"
      elevation="moderate"
      className="mb-4"
    >
      <TaskManagementWrapper
        onTaskUpdate={onTaskUpdate}
        allVisions={visions}
        allTasks={filteredTasks}
      >
        {(taskManagement) => {
          return (
            <DraggableTaskList
              tasks={sortedTasks}
              onEditTask={taskManagement.actions.handleEditTask}
              onDeleteTask={taskManagement.actions.handleDeleteTask}
              onStatusUpdate={taskManagement.actions.handleStatusUpdate}
              onAddSubtask={taskManagement.actions.handleAddSubtask}
              onViewTimeRecords={taskManagement.actions.handleViewTimeRecords}
              onCreateNote={taskManagement.actions.handleOpenCreateNoteModal}
              onViewNotes={taskManagement.actions.handleViewNotes}
              onCreateTimeRecord={
                taskManagement.actions.handleOpenCreateTimelogModal
              }
              expandedTasks={getExpandedTasks(groupId)}
              onToggleExpansion={(taskId) =>
                toggleTaskExpansion(groupId, taskId)
              }
              onTasksReorder={taskManagement.actions.handleTasksReorder}
              habitTaskAssociations={{}}
              visions={visions}
              taskLookup={taskLookup}
              showVisionInfo
              isPlanningPage
            />
          );
        }}
      </TaskManagementWrapper>
    </Card>
  );
};

import React from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatDateTime, formatDuration } from "@/utils/datetime";
import { PRIORITY, TASK_STATUS_LABELS } from "@/utils/constants";
import type { TaskTooltipData } from "./tooltipData";

interface TaskTooltipContentProps {
  task: TaskTooltipData | null;
}

const TaskTooltipContent: React.FC<TaskTooltipContentProps> = ({
  task,
}) => {
  const { t } = useTranslation();
  const noneLabel = t("draggableTaskList.tooltip.none");

  if (!task) {
    return null;
  }

  const priorityIndex = Number.isFinite(task.priority)
    ? Math.max(0, Math.min(PRIORITY.length - 1, Number(task.priority ?? 0)))
    : 0;
  const priorityInfo = PRIORITY[priorityIndex] ?? PRIORITY[0];
  const priorityLabel =
    priorityInfo.label ??
    (Number.isFinite(task.priority) ? String(task.priority) : noneLabel);

  const statusLabel =
    (task.status &&
      TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS]) ||
    task.status ||
    noneLabel;

  const planningCycleValue = (() => {
    if (!task.planningCycleType) {
      return null;
    }
    const cycleTypeMap: Record<string, string> = {
      day: t("draggableTaskList.planningCycle.day"),
      week: t("draggableTaskList.planningCycle.week"),
      month: t("draggableTaskList.planningCycle.month"),
      year: t("draggableTaskList.planningCycle.year"),
      "7years": t("draggableTaskList.planningCycle.7years"),
    };
    const periodText =
      cycleTypeMap[task.planningCycleType] || task.planningCycleType;
    if (task.planningCycleStartDate) {
      const formattedStart = formatDate(task.planningCycleStartDate);
      return t("draggableTaskList.tooltip.planningCycleValueWithDate", {
        period: periodText,
        date: formattedStart,
      });
    }
    return periodText;
  })();

  const totalEffort = formatDuration(task.actualEffortTotal ?? 0);
  const selfEffort = formatDuration(task.actualEffortSelf ?? 0);
  const createdAt = task.createdAt ? formatDateTime(task.createdAt) : null;
  const updatedAt = task.updatedAt ? formatDateTime(task.updatedAt) : null;

  return (
    <div>
      <div className=" mb-2 text-base-content">
        {t("draggableTaskList.tooltip.title", {
          name: task.content ?? noneLabel,
        })}
      </div>
      <ul className="space-y-1 text-base-content/80 text-sm">
        <li>
          {t("draggableTaskList.tooltip.vision", {
            vision: task.visionName ?? noneLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.parent", {
            parent: task.parentContent ?? noneLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.priority", {
            priority: priorityLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.status", {
            status: statusLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.planningCycle", {
            planning: planningCycleValue ?? noneLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.totalEffort", {
            duration: totalEffort,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.selfEffort", {
            duration: selfEffort,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.createdAt", {
            date: createdAt ?? noneLabel,
          })}
        </li>
        <li>
          {t("draggableTaskList.tooltip.updatedAt", {
            date: updatedAt ?? noneLabel,
          })}
        </li>
      </ul>
    </div>
  );
};

export default TaskTooltipContent;

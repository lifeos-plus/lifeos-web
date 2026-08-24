import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { timelogsApi } from "@/services/api/timelogs";
import type { components } from "@/services/api/generated/schema";
import {
  findCachedTimelog,
  invalidateTimelogLatestEndTime,
  invalidateTimelogLists,
  invalidateTimelogsAdvancedSearch,
  invalidateTimelogTaskDependencies,
  mergeTimelogIntoListCaches,
  removeTimelogDetailCache,
  removeTimelogsFromListCaches,
  setTimelogDetailCache,
} from "@/services/api/cacheInvalidation/timelogs";
import { useToast } from "@/contexts/ToastContext";
import type {
  TimelogCreate,
  TimelogUpdate,
  Timelog,
} from "@/services/api/timelogs";
import type { UUID } from "@/types/primitive";
import { logger } from "@/utils/core";

export function useTimelogMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  // Refresh after a mutation. Awaiting invalidations means the UI settles only
  // after the affected queries have refetched; failures are surfaced instead
  // of being silently swallowed.
  const refreshTimelogQueries = async (context: string) => {
    try {
      await Promise.all([
        invalidateTimelogLists(queryClient),
        invalidateTimelogLatestEndTime(queryClient),
        invalidateTimelogsAdvancedSearch(queryClient),
      ]);
    } catch (error) {
      logger.warn(context, error);
      toast.showError(
        t("timeLog.messages.timeLogRefreshFailed"),
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: TimelogCreate) => timelogsApi.create(data),
    onSuccess: async (result: Timelog) => {
      setTimelogDetailCache(queryClient, result);
      mergeTimelogIntoListCaches(queryClient, result);

      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after creating timelog",
        ),
        invalidateTimelogTaskDependencies(queryClient, [result]),
      ]);

      toast.showSuccess(
        t("timeLog.messages.timeLogCreateSuccess"),
        t("timeLog.messages.timeLogCreateSuccessMessage", {
          title: result.title,
        }),
      );
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogCreateFailed"),
        error.message || t("timeLog.messages.timeLogCreateFailedMessage"),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: TimelogUpdate }) =>
      timelogsApi.update(id, data),
    onSuccess: async (result: Timelog, variables) => {
      const previous = findCachedTimelog(queryClient, variables.id);
      setTimelogDetailCache(queryClient, result);
      mergeTimelogIntoListCaches(queryClient, result);

      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after updating timelog",
        ),
        invalidateTimelogTaskDependencies(queryClient, [
          previous,
          { task_id: variables.data.task_id },
          result,
        ]),
      ]);

      toast.showSuccess(
        t("timeLog.messages.timeLogUpdateSuccess"),
        t("timeLog.messages.timeLogUpdateSuccessMessage", {
          title: result.title,
        }),
      );
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogUpdateFailed"),
        error.message || t("timeLog.messages.timeLogUpdateFailedMessage"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: UUID) => timelogsApi.delete(id),
    onSuccess: async (_, eventId) => {
      const previous = findCachedTimelog(queryClient, eventId);
      removeTimelogDetailCache(queryClient, eventId);
      removeTimelogsFromListCaches(queryClient, [eventId]);

      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after deleting timelog",
        ),
        invalidateTimelogTaskDependencies(queryClient, [previous]),
      ]);

      toast.showSuccess(t("timeLog.messages.timeLogDeleteSuccess"));
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogDeleteFailed"),
        error.message || t("timeLog.messages.timeLogDeleteFailedMessage"),
      );
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (eventIds: UUID[]) => timelogsApi.batchDelete(eventIds),
    onSuccess: async (result, eventIds) => {
      const previousEntries = eventIds
        .map((eventId) => findCachedTimelog(queryClient, eventId))
        .filter((entry): entry is Timelog => Boolean(entry));
      eventIds.forEach((eventId) =>
        removeTimelogDetailCache(queryClient, eventId),
      );
      removeTimelogsFromListCaches(queryClient, eventIds);

      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after batch deleting timelogs",
        ),
        invalidateTimelogTaskDependencies(queryClient, previousEntries),
      ]);

      if (result.failed_ids.length > 0) {
        toast.showError(
          t("timeLog.messages.timeLogBatchDeletePartialFailed"),
          t("timeLog.messages.timeLogBatchDeletePartialFailedMessage", {
            deletedCount: result.deleted_count,
            failedCount: result.failed_ids.length,
            errors: result.errors.join(", "),
          }),
        );
      } else {
        toast.showSuccess(
          t("timeLog.messages.timeLogBatchDeleteSuccess"),
          t("timeLog.messages.timeLogBatchDeleteSuccessMessage", {
            deletedCount: result.deleted_count,
          }),
        );
      }
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogBatchDeleteFailed"),
        error.message || t("timeLog.messages.timeLogBatchDeleteFailedMessage"),
      );
    },
  });

  const batchCreateMutation = useMutation({
    mutationFn: (timelogs: TimelogCreate[]) =>
      timelogsApi.batchCreate(timelogs),
    onSuccess: async (result) => {
      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after batch creating timelogs",
        ),
        invalidateTimelogTaskDependencies(queryClient, result.created_timelogs),
      ]);

      if (result.failed_count > 0) {
        toast.showError(
          t("timeLog.messages.timeLogBatchCreatePartialFailed"),
          t("timeLog.messages.timeLogBatchCreatePartialFailedMessage", {
            createdCount: result.created_count,
            failedCount: result.failed_count,
            errors: result.errors.join(", "),
          }),
        );
      } else {
        toast.showSuccess(
          t("timeLog.messages.timeLogBatchCreateSuccess"),
          t("timeLog.messages.timeLogBatchCreateSuccessMessage", {
            createdCount: result.created_count,
          }),
        );
      }
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogBatchCreateFailed"),
        error.message || t("timeLog.messages.timeLogBatchCreateFailedMessage"),
      );
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (params: {
      timelog_ids: UUID[];
      update_type: "person" | "title" | "task" | "area";
      person?: components["schemas"]["TimelogBatchPersonUpdate"];
      title?: {
        mode: "replace" | "find_replace";
        value: string;
        find?: string;
      };
      task?: {
        mode: "replace" | "clear";
        task_id?: UUID;
      };
      area?: {
        area_id: UUID | null;
      };
    }) => timelogsApi.batchUpdate(params),
    onSuccess: async (result, params) => {
      const affectedEntries = params.timelog_ids
        .map((timelogId) => findCachedTimelog(queryClient, timelogId))
        .filter((entry): entry is Timelog => Boolean(entry));

      await Promise.all([
        refreshTimelogQueries(
          "Failed to refresh caches after batch updating timelogs",
        ),
        invalidateTimelogTaskDependencies(queryClient, affectedEntries),
      ]);

      if (result.failed_ids.length > 0) {
        toast.showError(
          t("timeLog.messages.timeLogBatchUpdatePartialFailed"),
          t("timeLog.messages.timeLogBatchUpdatePartialFailedMessage", {
            updatedCount: result.updated_count,
            failedCount: result.failed_ids.length,
            errors: result.errors.join(", "),
          }),
        );
      } else {
        toast.showSuccess(
          t("timeLog.messages.timeLogBatchUpdateSuccess"),
          t("timeLog.messages.timeLogBatchUpdateSuccessMessage", {
            updatedCount: result.updated_count,
          }),
        );
      }
    },
    onError: (error: Error) => {
      toast.showError(
        t("timeLog.messages.timeLogBatchUpdateFailed"),
        error.message || t("timeLog.messages.timeLogBatchUpdateFailedMessage"),
      );
    },
  });

  return {
    // Individual mutations
    createTimelog: createMutation,
    updateTimelog: updateMutation,
    deleteTimelog: deleteMutation,

    // Batch mutations
    batchCreateTimelogs: batchCreateMutation,
    batchUpdateTimelogs: batchUpdateMutation,
    batchDeleteTimelogs: batchDeleteMutation,

    // Convenience methods for async operations
    createTimelogAsync: createMutation.mutateAsync,
    updateTimelogAsync: updateMutation.mutateAsync,
    deleteTimelogAsync: deleteMutation.mutateAsync,
    batchCreateTimelogsAsync: batchCreateMutation.mutateAsync,
    batchUpdateTimelogsAsync: batchUpdateMutation.mutateAsync,
    batchDeleteTimelogsAsync: batchDeleteMutation.mutateAsync,
  };
}

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "@/contexts/ToastContext";
import {
  notesApi,
  type NoteBatchUpdatePayload,
  type NoteBatchUpdateResult,
} from "@/services/api/notes";
import type { UUID } from "@/types/primitive";

interface SubmitBatchEditOptions {
  notes: Array<{ id: UUID; content: string }>;
  findText: string;
  replaceText: string;
  caseSensitive: boolean;
}

interface UseNotesBatchEditControllerParams {
  onSuccess: () => void;
  onCompleted: () => void;
  resetState: () => void;
}

export function useNotesBatchEditController({
  onSuccess,
  onCompleted,
  resetState,
}: UseNotesBatchEditControllerParams) {
  const { t } = useTranslation();
  const { showError, showInfo, showSuccess } = useToast();

  const mutation = useMutation<
    NoteBatchUpdateResult,
    Error,
    NoteBatchUpdatePayload
  >({
    mutationFn: (payload) => notesApi.batchUpdate(payload),
  });

  const submitBatchEdit = useCallback(
    async ({
      notes,
      findText,
      replaceText,
      caseSensitive,
    }: SubmitBatchEditOptions) => {
      if (notes.length === 0) {
        showError(t("notes.batchEdit.title"), t("notes.batchEdit.noSelection"));
        return;
      }
      if (!findText.trim()) {
        showError(
          t("notes.batchEdit.title"),
          t("notes.batchEdit.findTextRequired"),
        );
        return;
      }

      try {
        const result = await mutation.mutateAsync({
          note_ids: notes.map((note) => note.id),
          notes,
          content: {
            find_text: findText,
            replace_text: replaceText,
            case_sensitive: caseSensitive,
          },
        });

        if (result.updated_count > 0) {
          showSuccess(
            t("notes.batchEdit.successTitle"),
            t("notes.batchEdit.successMessage", {
              updated: result.updated_count,
              failed: result.failed_ids.length,
            }),
          );
        }
        if (result.failed_ids.length > 0) {
          showInfo(
            t("notes.batchEdit.partialTitle"),
            t("notes.batchEdit.partialMessage", {
              failed: result.failed_ids.length,
            }),
          );
        }

        onSuccess();
        resetState();
        onCompleted();
      } catch (error) {
        showError(
          t("notes.batchEdit.errorTitle"),
          error instanceof Error ? error.message : t("common.operationFailed"),
        );
      }
    },
    [
      mutation,
      onCompleted,
      onSuccess,
      resetState,
      showError,
      showInfo,
      showSuccess,
      t,
    ],
  );

  return {
    isPending: mutation.isPending,
    submitBatchEdit,
  };
}

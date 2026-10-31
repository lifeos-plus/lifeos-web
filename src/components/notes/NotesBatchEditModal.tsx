import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import ModalBase from "@/layouts/ModalBase";
import ActionButton from "@/components/ActionButton";
import { FormField, TextInput } from "@/components/forms";
import { useNotesBatchEditController } from "@/features/notes/controller/useNotesBatchEditController";
import type { UUID } from "@/types/primitive";

interface NotesBatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNotes: Array<{ id: UUID; content: string }>;
  onSuccess: () => void;
}

const NotesBatchEditModal = ({
  isOpen,
  onClose,
  selectedNotes,
  onSuccess,
}: NotesBatchEditModalProps) => {
  const { t } = useTranslation();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  const resetState = useCallback(() => {
    setFindText("");
    setReplaceText("");
    setCaseSensitive(false);
  }, []);

  const { isPending, submitBatchEdit } = useNotesBatchEditController({
    onSuccess,
    onCompleted: onClose,
    resetState,
  });

  const handleClose = useCallback(() => {
    if (isPending) return;
    resetState();
    onClose();
  }, [isPending, onClose, resetState]);

  return (
    <ModalBase isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl text-base-content">
            {t("notes.batchEdit.modalTitle", { count: selectedNotes.length })}
          </h2>
          <p className="text-sm text-base-content/70 mt-1">
            {t("notes.batchEdit.description")}
          </p>
        </div>

        <FormField label={t("notes.batchEdit.findText")} htmlFor="notes-batch-find">
          <TextInput
            id="notes-batch-find"
            type="text"
            value={findText}
            onChange={(event) => setFindText(event.target.value)}
          />
        </FormField>
        <FormField
          label={t("notes.batchEdit.replaceText")}
          htmlFor="notes-batch-replace"
        >
          <TextInput
            id="notes-batch-replace"
            type="text"
            value={replaceText}
            onChange={(event) => setReplaceText(event.target.value)}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <ActionButton
            label={
              caseSensitive
                ? t("notes.batchEdit.caseSensitiveOn")
                : t("notes.batchEdit.caseSensitiveOff")
            }
            iconName="language"
            color={caseSensitive ? "primary" : "neutral"}
            variant={caseSensitive ? "solid" : "outline"}
            onClick={() => setCaseSensitive((previous) => !previous)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <ActionButton
            label={t("common.cancel")}
            onClick={handleClose}
            color="neutral"
            variant="outline"
            disabled={isPending}
          />
          <ActionButton
            label={
              isPending ? t("common.processing") : t("notes.batchEdit.apply")
            }
            onClick={() =>
              submitBatchEdit({
                notes: selectedNotes,
                findText,
                replaceText,
                caseSensitive,
              })
            }
            color="primary"
            disabled={isPending}
          />
        </div>
      </div>
    </ModalBase>
  );
};

export default NotesBatchEditModal;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Card from "@/layouts/Card";
import { FormField, TextInput } from "@/components/forms";
import ActionButton from "@/components/ActionButton";
import TagSelector from "@/components/selects/TagSelector";
import PersonSelector from "@/components/selects/PersonSelector";
import TaskSelector from "@/components/selects/TaskSelector";
import type { Tag } from "@/services/api/tags";
import type { UUID } from "@/types/primitive";

export interface NotesAdvancedSearchFormState {
  tag_id: UUID | null;
  person_id: UUID | null;
  task_id: UUID | null;
  keyword: string;
}

interface NotesAdvancedSearchPanelProps {
  params: NotesAdvancedSearchFormState;
  onParamsChange: (params: NotesAdvancedSearchFormState) => void;
  onSearch: () => void;
  onReset: () => void;
  onExport?: () => void;
  onCopyResults?: () => void;
  availableTags: Tag[];
  onCreateTag: (tagName: string) => Promise<Tag>;
  availableTasks: { id: UUID; name: string }[];
  isSelectMode: boolean;
  onSelectModeToggle: (value: boolean) => void;
  selectedNoteIds: Set<UUID>;
  onSelectAll: () => void;
  onSelectInverse: () => void;
  onClearSelection: () => void;
  onOpenBatchEdit: () => void;
  onBatchDelete: () => void;
  totalResults: number;
  isLoading?: boolean;
  canCopyResults: boolean;
}

const NotesAdvancedSearchPanel = ({
  params,
  onParamsChange,
  onSearch,
  onReset,
  onExport,
  onCopyResults,
  availableTags,
  onCreateTag,
  availableTasks,
  isSelectMode,
  onSelectModeToggle,
  selectedNoteIds,
  onSelectAll,
  onSelectInverse,
  onClearSelection,
  onOpenBatchEdit,
  onBatchDelete,
  totalResults,
  isLoading = false,
  canCopyResults,
}: NotesAdvancedSearchPanelProps) => {
  const { t } = useTranslation();
  const initialKeyword = params.keyword || "";
  const [keywordDraft, setKeywordDraft] = useState(initialKeyword);
  const keywordDraftRef = useRef(initialKeyword);
  const hasPendingKeywordRef = useRef(false);
  const searchTriggerRef = useRef(false);
  const paramsRef = useRef({ ...params, keyword: initialKeyword });

  useEffect(() => {
    keywordDraftRef.current = keywordDraft;
  }, [keywordDraft]);

  useEffect(() => {
    paramsRef.current = { ...params, keyword: keywordDraftRef.current };
  }, [params, keywordDraft]);

  useEffect(() => {
    const externalKeyword = params.keyword || "";
    const currentDraft = keywordDraftRef.current;
    if (!hasPendingKeywordRef.current || externalKeyword !== currentDraft) {
      hasPendingKeywordRef.current = false;
      if (externalKeyword !== currentDraft) {
        setKeywordDraft(externalKeyword);
      }
    }
    if (searchTriggerRef.current) {
      searchTriggerRef.current = false;
      onSearch();
    }
  }, [params.keyword, onSearch]);

  const handleKeywordChange = useCallback((value: string) => {
    keywordDraftRef.current = value;
    hasPendingKeywordRef.current = true;
    setKeywordDraft(value);
  }, []);

  const commitKeyword = useCallback(() => {
    const currentDraft = keywordDraftRef.current;
    hasPendingKeywordRef.current = false;
    searchTriggerRef.current = true;
    onParamsChange({
      ...paramsRef.current,
      keyword: currentDraft,
    });
  }, [onParamsChange]);

  const preloadedTasks = useMemo(
    () =>
      availableTasks.map((task) => ({
        id: task.id,
        content: task.name,
        status: "todo",
        vision_id: task.id,
        parent_task_id: null,
        priority: 1,
        display_order: 0,
        estimated_effort: null,
        actual_effort_self: 0,
        actual_effort_total: 0,
        notes_count: 0,
        created_at: "1970-01-01T00:00:00.000Z",
        updated_at: "1970-01-01T00:00:00.000Z",
      })),
    [availableTasks],
  );

  return (
    <Card
      title={t("notes.advancedSearch.title")}
      className="w-full min-w-0"
      contentClassName="min-w-0"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 min-w-0">
        <FormField label={t("notes.advancedSearch.tagFilter")}>
          <TagSelector
            availableTags={availableTags}
            selectedTagIds={params.tag_id ? [params.tag_id] : []}
            onTagsChange={(tagIds) =>
              onParamsChange({
                ...paramsRef.current,
                tag_id: tagIds[0] ?? null,
              })
            }
            onCreateTag={onCreateTag}
            size="sm"
            multiple={false}
          />
        </FormField>

        <FormField label={t("notes.advancedSearch.personFilter")}>
          <PersonSelector
            selectedPersonIds={params.person_id ? [params.person_id] : []}
            onSelectionChange={(personIds) =>
              onParamsChange({
                ...paramsRef.current,
                person_id: personIds[0] ?? null,
              })
            }
            multiple={false}
            size="sm"
            showNoPersonOption={true}
          />
        </FormField>

        <FormField label={t("notes.advancedSearch.taskFilter")}>
          <TaskSelector
            value={params.task_id}
            placeholder={t("notes.advancedSearch.selectTaskPlaceholder")}
            onChange={(value) =>
              onParamsChange({
                ...paramsRef.current,
                task_id: value,
              })
            }
            deferRemoteLoad={true}
            preloadedTasks={preloadedTasks}
            showSpecialOptions={false}
            showNoTaskOption={true}
            expandFilterForSelected={true}
            idPrefix="notes-advanced-task"
            className="w-full"
          />
        </FormField>
      </div>

      <FormField
        label={t("notes.advancedSearch.keyword")}
        htmlFor="notes-advanced-keyword"
        description={t("notes.advancedSearch.keywordDescription")}
      >
        <TextInput
          id="notes-advanced-keyword"
          name="notes-advanced-keyword"
          type="text"
          value={keywordDraft}
          onChange={(event) => handleKeywordChange(event.target.value)}
          onCompositionEnd={(event) =>
            handleKeywordChange((event.target as HTMLInputElement).value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitKeyword();
            }
          }}
          size="sm"
          placeholder={t("notes.advancedSearch.keywordPlaceholder")}
        />
      </FormField>

      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap gap-2 min-w-0 flex-shrink-0">
          <ActionButton
            label={
              isLoading ? t("common.loading") : t("notes.advancedSearch.search")
            }
            iconName="search"
            color="success"
            variant="outline"
            onClick={commitKeyword}
            disabled={isLoading}
          />
          <ActionButton
            label={t("notes.advancedSearch.reset")}
            iconName="refresh"
            color="neutral"
            variant="outline"
            onClick={() => {
              hasPendingKeywordRef.current = false;
              keywordDraftRef.current = "";
              setKeywordDraft("");
              onReset();
            }}
          />
          {onCopyResults && (
            <ActionButton
              label={t("notes.advancedSearch.copyResults")}
              iconName="clipboard"
              color="primary"
              variant="outline"
              onClick={onCopyResults}
              disabled={!canCopyResults || isLoading}
            />
          )}
          {onExport && (
            <ActionButton
              label={t("notes.advancedSearch.export")}
              iconName="upload"
              color="primary"
              variant="outline"
              onClick={onExport}
              disabled={
                isLoading ||
                totalResults === 0 ||
                keywordDraft !== (params.keyword || "")
              }
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
          {!isSelectMode ? (
            <ActionButton
              label={t("notes.advancedSearch.enableBatch")}
              iconName="switch"
              color="primary"
              variant="outline"
              onClick={() => onSelectModeToggle(true)}
              disabled={totalResults === 0}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label={t("notes.advancedSearch.selectAll")}
                iconName="check"
                onClick={onSelectAll}
                color="primary"
              />
              <ActionButton
                label={t("notes.advancedSearch.selectInverse")}
                iconName="repeat"
                onClick={onSelectInverse}
                color="primary"
              />
              <ActionButton
                label={t("notes.advancedSearch.batchEdit")}
                iconName="edit"
                onClick={onOpenBatchEdit}
                color="primary"
                disabled={selectedNoteIds.size === 0}
              />
              <ActionButton
                label={t("notes.advancedSearch.batchDelete")}
                iconName="trash"
                onClick={onBatchDelete}
                color="error"
                disabled={selectedNoteIds.size === 0}
              />
              <ActionButton
                label={t("common.cancel")}
                iconName="x-mark"
                color="neutral"
                onClick={() => {
                  onSelectModeToggle(false);
                  onClearSelection();
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-sm text-base-content/70 flex flex-wrap items-center gap-3">
        <span>
          {t("notes.advancedSearch.totalResults", { count: totalResults })}
        </span>
        {isSelectMode && (
          <span>
            {t("notes.advancedSearch.selectedCount", {
              count: selectedNoteIds.size,
            })}
          </span>
        )}
      </div>
    </Card>
  );
};

export default NotesAdvancedSearchPanel;

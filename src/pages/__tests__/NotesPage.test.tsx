import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderWithProviders, setupTranslationMock } from "@test/utils";

const notesTagState = vi.hoisted(() => ({
  onCreateTag: undefined as
    | ((tagName: string) => Promise<unknown>)
    | undefined,
  createTag: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({ setHeader: vi.fn() }),
}));

vi.mock("@/contexts/ToastContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/ToastContext")>();
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn(),
    }),
  };
});

vi.mock("@/hooks/useQueryMode", () => ({
  useQueryMode: () => ({ queryMode: "single", setQueryMode: vi.fn() }),
}));

vi.mock("@/features/notes/controller/useNotesPageData", () => ({
  NOTES_ADVANCED_PAGE_SIZE: 100,
  useNotesPageData: () => ({
    notes: [],
    isLoading: false,
    error: null,
    hasMore: false,
    isLoadingMore: false,
    isLoadingStats: false,
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    loadMoreNotes: vi.fn(),
    activeTimezone: "Asia/Shanghai",
    noteCollapsePreference: {},
    noteFilters: {
      filteredNotes: [],
      selectedFilterTaskId: null,
      selectedFilterTags: [],
      selectedFilterPersons: [],
      searchKeyword: "",
      isSearchApplied: false,
      showUntaggedOnly: false,
      tagUsageStats: {},
      personUsageStats: {},
      uniquePersons: [],
      handleTagClick: vi.fn(),
      handlePersonClick: vi.fn(),
      handleTaskClick: vi.fn(),
      handleUntaggedToggle: vi.fn(),
      applyTextSearch: vi.fn(),
      clearAllFilters: vi.fn(),
      setSearchKeyword: vi.fn(),
    },
    tasksForAdvancedSearch: [],
    notesAdvancedSearch: {
      isLoading: false,
      isError: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
    },
    notesAdvancedSearchRef: {
      current: {
        search: vi.fn(),
        clearSearch: vi.fn(),
        refetch: vi.fn(),
      },
    },
    advancedSearchParams: {
      tag_id: null,
      person_id: null,
      task_id: null,
      keyword: null,
    },
    setAdvancedSearchParams: vi.fn(),
    advancedFormState: {
      tag_id: null,
      person_id: null,
      task_id: null,
      keyword: "",
    },
    advancedNotes: [],
    canCopyAdvancedResults: false,
    mapApiNoteToLocal: vi.fn(),
  }),
}));

vi.mock("@/features/notes/controller/useNotesAdvancedSelection", () => ({
  useNotesAdvancedSelection: () => ({
    isSelectMode: false,
    toggleSelectMode: vi.fn(),
    selectedNoteIds: new Set<string>(),
    handleSelectNote: vi.fn(),
    handleSelectAll: vi.fn(),
    handleSelectInverse: vi.fn(),
    clearSelection: vi.fn(),
    loadAdvancedSearchResults: vi.fn(),
    handleAdvancedReset: vi.fn(),
    isBatchDeleteConfirmOpen: false,
    openBatchDeleteConfirm: vi.fn(),
    closeBatchDeleteConfirm: vi.fn(),
    handleBatchDeleteConfirm: vi.fn(),
    handleBatchEditSuccess: vi.fn(),
  }),
}));

vi.mock("@/hooks/selectors/useTagSelectorSource", () => ({
  useTagSelectorSource: () => ({
    tags: [],
    refresh: notesTagState.refresh,
    createTag: notesTagState.createTag,
  }),
}));

vi.mock("@/components/notes/NoteInputForm", () => ({
  NoteInputForm: (props: {
    onCreateTag?: (tagName: string) => Promise<unknown>;
  }) => {
    notesTagState.onCreateTag = props.onCreateTag;
    return <div data-testid="note-input-form" />;
  },
}));

vi.mock("@/components/notes/NotesList", () => ({
  NotesList: () => <div data-testid="notes-list" />,
}));

vi.mock("@/components/notes/NotesSidebar", () => ({
  NotesSidebar: () => null,
}));

vi.mock("@/components/notes/FilterStatus", () => ({
  FilterStatus: () => null,
}));

vi.mock("@/components/notes/NotesBatchEditModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/notes/NotesAdvancedSearchPanel", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/notes/NotesBulkImportPanel", () => ({
  NotesBulkImportPanel: () => null,
}));

vi.mock("@/components/notes/NotesModeBanner", () => ({
  NotesModeBanner: () => null,
}));

vi.mock("@/components/CreateNoteModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/TagManagerModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/PersonDetailModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/PersonFormModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/ConfirmDialog", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/ActionButton", () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <button>{label}</button>,
}));

vi.mock("@/components/ErrorDisplay", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/LoadingSpinner", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/layouts/PageLayout", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import NotesPage from "@/pages/NotesPage";

describe("NotesPage tag creation", () => {
  beforeEach(() => {
    setupTranslationMock();
    notesTagState.onCreateTag = undefined;
    notesTagState.createTag.mockReset();
    notesTagState.refresh.mockReset();
  });

  it("refreshes note tags after creating one", async () => {
    const created = { id: "tag-1", name: "fresh" };
    notesTagState.createTag.mockResolvedValue(created);
    notesTagState.refresh.mockResolvedValue(undefined);

    renderWithProviders(<NotesPage />);

    const onCreateTag = notesTagState.onCreateTag;
    expect(onCreateTag).toBeTypeOf("function");

    const result = await onCreateTag?.("fresh");

    expect(notesTagState.createTag).toHaveBeenCalledWith("fresh");
    expect(notesTagState.refresh).toHaveBeenCalledTimes(1);
    expect(result).toBe(created);
  });

  it("preserves the original error as the cause when tag creation fails", async () => {
    const originalError = new Error("network down");
    notesTagState.createTag.mockRejectedValue(originalError);

    renderWithProviders(<NotesPage />);

    const onCreateTag = notesTagState.onCreateTag;
    expect(onCreateTag).toBeTypeOf("function");

    await expect(onCreateTag?.("broken")).rejects.toMatchObject({
      cause: originalError,
    });
    expect(notesTagState.refresh).not.toHaveBeenCalled();
  });
});

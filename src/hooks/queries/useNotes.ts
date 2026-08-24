import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { notesApi } from "@/services/api/notes";
import type { NoteUpdate, NoteCreate } from "@/services/api/notes";
import { notesKeys } from "@/services/api/queryKeys";
import {
  invalidateNotesLists,
  invalidateNotesAdvancedSearch,
  invalidateNotesStats,
} from "@/services/api/cacheInvalidation/notes";
import { useToast } from "@/contexts/ToastContext";
import type { UUID } from "@/types/primitive";
export function useNotes(
  filters: {
    tag_id?: UUID;
    person_id?: UUID;
    task_id?: UUID;
    timelog_id?: UUID;
    keyword?: string;
    untagged?: boolean;
  } = {},
) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  const {
    data,
    error,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: notesKeys.list(filters),
    queryFn: ({ pageParam = 1, signal }) =>
      notesApi.fetchPaged(
        { ...filters, page: pageParam as number, size: 20 },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.pagination.page;
      return currentPage < lastPage.pagination.pages
        ? currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    // 保留上一份数据，避免筛选切换时 data 瞬空导致页面闪屏
    placeholderData: (previousData) => previousData,
  });

  const pages = data?.pages;
  const notes = useMemo(() => {
    if (!pages) {
      return [];
    }
    return pages.flatMap((page) => page.items ?? []);
  }, [pages]);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: notesKeys.stats(),
    queryFn: notesApi.getStats,
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData: NoteCreate) => notesApi.create(noteData),
    onSuccess: async (createdNote) => {
      toast.showSuccess(t("notes.messages.createSuccess"));
      queryClient.setQueryData(notesKeys.detail(createdNote.id), createdNote);
      await Promise.all([
        invalidateNotesLists(queryClient),
        invalidateNotesStats(queryClient),
        invalidateNotesAdvancedSearch(queryClient),
      ]);
    },
    onError: (err: Error) => {
      toast.showError(t("notes.messages.createFailed"), err.message);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: (variables: { noteId: UUID; data: NoteUpdate }) =>
      notesApi.update(variables.noteId, variables.data),
    onSuccess: async (updatedNote) => {
      toast.showSuccess(t("notes.messages.updateSuccess"));
      queryClient.setQueryData(notesKeys.detail(updatedNote.id), updatedNote);
      await Promise.all([
        invalidateNotesLists(queryClient),
        invalidateNotesStats(queryClient),
        invalidateNotesAdvancedSearch(queryClient),
      ]);
    },
    onError: (err: Error) => {
      toast.showError(t("notes.messages.updateFailed"), err.message);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: UUID) => notesApi.delete(noteId),
    onSuccess: async (_, noteId) => {
      toast.showSuccess(t("notes.messages.deleteSuccess"));
      queryClient.removeQueries({
        queryKey: notesKeys.detail(noteId),
        exact: true,
      });
      await Promise.all([
        invalidateNotesLists(queryClient),
        invalidateNotesStats(queryClient),
        invalidateNotesAdvancedSearch(queryClient),
      ]);
    },
    onError: (err: Error) => {
      toast.showError(t("notes.messages.deleteFailed"), err.message);
    },
  });

  return {
    notes,
    stats,
    isLoading: isFetching && !isFetchingNextPage,
    isLoadingStats,
    error,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMoreNotes: fetchNextPage,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
  };
}

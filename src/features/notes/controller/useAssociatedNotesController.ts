import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { habitsApi } from "@/services/api/habits";
import { notesApi } from "@/services/api/notes";
import { notesKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";

type AssociatedNotesFilter =
  | {
      task_id?: UUID;
      timelog_id?: never;
      habit_action_id?: never;
      tag_id?: never;
    }
  | {
      task_id?: never;
      timelog_id?: UUID;
      habit_action_id?: never;
      tag_id?: never;
    }
  | {
      task_id?: never;
      timelog_id?: never;
      habit_action_id?: UUID;
      tag_id?: never;
    }
  | {
      task_id?: never;
      timelog_id?: never;
      habit_action_id?: never;
      tag_id?: UUID;
    };

export type AssociatedNotesSource =
  | { kind: "filters"; filters: AssociatedNotesFilter }
  | { kind: "habit"; habitId: UUID | null };

interface UseAssociatedNotesControllerParams {
  isOpen: boolean;
  enabledId: UUID | null;
  source: AssociatedNotesSource;
}

export function useAssociatedNotesController({
  isOpen,
  enabledId,
  source,
}: UseAssociatedNotesControllerParams) {
  const queryFilters =
    source.kind === "habit" ? { habit_id: source.habitId } : source.filters;
  const {
    data: notesData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: notesKeys.associatedList(queryFilters as Record<string, unknown>),
    queryFn: ({ pageParam, signal }) => {
      if (source.kind === "habit") {
        if (!source.habitId) {
          throw new Error("Habit ID is required to load habit notes.");
        }
        return habitsApi.getNotes(
          source.habitId,
          { page: pageParam, size: 50 },
          { signal },
        );
      }
      return notesApi.fetchPaged(
        {
          ...source.filters,
          page: pageParam,
          size: 50,
        },
        { signal },
      );
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.pagination.page;
      return currentPage < lastPage.pagination.pages
        ? currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: isOpen && !!enabledId,
    staleTime: 5 * 60 * 1000,
  });

  const notes = useMemo(
    () => notesData?.pages.flatMap((page) => page.items) ?? [],
    [notesData],
  );
  const total = notesData?.pages[0]?.pagination.total ?? notes.length;

  return {
    notes,
    total,
    isLoading,
    error,
    refetch,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMoreNotes: fetchNextPage,
  };
}

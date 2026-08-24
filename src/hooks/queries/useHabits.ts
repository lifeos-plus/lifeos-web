import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  habitsApi,
  type Habit,
  type HabitCreate,
  type HabitUpdate,
  type HabitAction,
  type HabitActionUpdate,
} from "@/services/api/habits";
import { habitsKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";
import {
  invalidateHabitActions,
  invalidateHabitActionWindows,
  invalidateHabitStats,
  invalidateHabitsLists,
  removeHabitDetailCache,
  setHabitDetailCache,
} from "@/services/api/cacheInvalidation/habits";

interface UseHabitsFilters {
  statusFilter?: string;
}

interface UseHabitsReturn {
  // Data
  habits: Habit[];

  // Loading states
  isLoading: boolean;

  // Error states
  error: Error | null;

  // Actions
  createHabit: (habit: HabitCreate) => Promise<Habit>;
  updateHabit: (id: UUID, habit: HabitUpdate) => Promise<Habit>;
  deleteHabit: (id: UUID) => void;
  updateActionStatus: (
    habitId: UUID,
    action: HabitAction,
    newStatus: string,
  ) => void;
  updateActionNotes: (
    habitId: UUID,
    action: HabitAction,
    notes: string,
  ) => void;

  // Mutations
  createHabitMutation: ReturnType<
    typeof useMutation<Habit, Error, HabitCreate>
  >;
  updateHabitMutation: ReturnType<
    typeof useMutation<Habit, Error, { id: UUID; habit: HabitUpdate }>
  >;
  deleteHabitMutation: ReturnType<
    typeof useMutation<void, Error, { id: UUID }>
  >;
  updateActionMutation: ReturnType<
    typeof useMutation<
      HabitAction,
      Error,
      { habitId: UUID; actionId: UUID; actionUpdate: HabitActionUpdate }
    >
  >;
}

export function useHabits(filters: UseHabitsFilters = {}): UseHabitsReturn {
  const queryClient = useQueryClient();

  const {
    data: habitsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: habitsKeys.list({ statusFilter: filters.statusFilter }),
    queryFn: async () => {
      const response = await habitsApi.getOverviews(filters.statusFilter);
      return response.items.map(({ habit, stats }) => ({
        ...habit,
        stats,
      }));
    },
  });

  const habits = habitsData || [];

  const createHabitMutation = useMutation({
    mutationFn: (habit: HabitCreate) => habitsApi.create(habit),
    onSuccess: async (created) => {
      setHabitDetailCache(queryClient, created);
      await Promise.all([
        invalidateHabitsLists(queryClient),
        invalidateHabitActionWindows(queryClient),
      ]);
    },
    onError: (err: Error) => {
      console.error("Create habit failed", err.message);
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, habit }: { id: UUID; habit: HabitUpdate }) =>
      habitsApi.update(id, habit),
    onSuccess: async (updated) => {
      setHabitDetailCache(queryClient, updated);
      await Promise.all([
        invalidateHabitsLists(queryClient),
        invalidateHabitStats(queryClient, updated.id),
        invalidateHabitActions(queryClient, updated.id),
        invalidateHabitActionWindows(queryClient),
      ]);
    },
    onError: (err: Error) => {
      console.error("Update habit failed", err.message);
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: ({ id }: { id: UUID }) => habitsApi.delete(id),
    onSuccess: async (_, variables) => {
      const habitId = variables.id;
      removeHabitDetailCache(queryClient, habitId);
      await Promise.all([
        invalidateHabitsLists(queryClient),
        invalidateHabitStats(queryClient, habitId),
        invalidateHabitActions(queryClient, habitId),
        invalidateHabitActionWindows(queryClient),
      ]);
    },
    onError: (err: Error) => {
      console.error("Delete habit failed", err.message);
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({
      habitId,
      actionId,
      actionUpdate,
    }: {
      habitId: UUID;
      actionId: UUID;
      actionUpdate: HabitActionUpdate;
    }) => habitsApi.updateAction(habitId, actionId, actionUpdate),
    onSuccess: (_, { habitId }) => {
      void invalidateHabitActions(queryClient, habitId);
      void invalidateHabitActionWindows(queryClient);
      void invalidateHabitStats(queryClient, habitId);
    },
    onError: (err: Error) => {
      console.error("Update action status failed", err.message);
    },
  });

  const updateActionStatus = (
    habitId: UUID,
    action: HabitAction,
    newStatus: string,
  ) => {
    if (!action.id) return;
    updateActionMutation.mutate({
      habitId,
      actionId: action.id,
      actionUpdate: { status: newStatus },
    });
  };

  const updateActionNotes = (
    habitId: UUID,
    action: HabitAction,
    notes: string,
  ) => {
    if (!action.id) return;
    updateActionMutation.mutate({
      habitId,
      actionId: action.id,
      actionUpdate: { notes },
    });
  };

  const createHabit = (habit: HabitCreate): Promise<Habit> => {
    return new Promise((resolve, reject) => {
      createHabitMutation.mutate(habit, {
        onSuccess: (data) => {
          resolve(data);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const updateHabit = (id: UUID, habit: HabitUpdate): Promise<Habit> => {
    return new Promise((resolve, reject) => {
      updateHabitMutation.mutate(
        { id, habit },
        {
          onSuccess: (data) => {
            resolve(data);
          },
          onError: (error) => {
            reject(error);
          },
        },
      );
    });
  };

  const deleteHabit = (id: UUID) => {
    deleteHabitMutation.mutate({ id });
  };

  return {
    habits,
    isLoading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    updateActionStatus,
    updateActionNotes,
    createHabitMutation,
    updateHabitMutation,
    deleteHabitMutation,
    updateActionMutation,
  };
}

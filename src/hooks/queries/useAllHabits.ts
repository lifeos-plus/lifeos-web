import { useQuery } from "@tanstack/react-query";
import { habitsApi } from "@/services/api/habits";
import { habitsKeys } from "@/services/api/queryKeys";

/**
 * Fetches habits across all statuses (size 500) to power filter-option
 * counts. Uses a query key distinct from the status-filtered render list so
 * the two caches stay independent.
 */
export function useAllHabits() {
  const page = 1;
  const size = 500;

  const { data, isLoading, error } = useQuery({
    queryKey: habitsKeys.list({ statusFilter: undefined, page, size }),
    queryFn: async () => {
      const response = await habitsApi.getOverviews(undefined, { page, size });
      return response.items.map(({ habit, stats }) => ({
        ...habit,
        stats,
      }));
    },
  });

  return {
    habits: data ?? [],
    isLoading,
    error,
  };
}

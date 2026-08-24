import { useQuery } from "@tanstack/react-query";
import { visionsApi } from "@/services/api/visions";
import { visionsKeys } from "@/services/api/queryKeys";

/**
 * Fetches visions across all statuses (size capped at the backend limit of
 * 500) to power filter-option counts. Uses a query key distinct from the
 * status-filtered render list so the two caches stay independent.
 */
export function useAllVisions() {
  const page = 1;
  const size = 500;

  const { data, isLoading, error } = useQuery({
    queryKey: visionsKeys.list({ status: undefined, page, size }),
    queryFn: () => visionsApi.getAll(undefined, page, size),
  });

  return {
    visions: data?.items ?? [],
    isLoading,
    error,
  };
}

import { useQuery } from "@tanstack/react-query";
import { habitsApi } from "@/services/api/habits";
import { habitsKeys } from "@/services/api/queryKeys";

/**
 * 拉取全部状态的习惯（size 取 500），
 * 用于筛选选项的计数展示。与按状态筛选的渲染列表使用不同的
 * query key，独立缓存、互不影响。
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

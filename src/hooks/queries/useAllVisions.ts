import { useQuery } from "@tanstack/react-query";
import { visionsApi } from "@/services/api/visions";
import { visionsKeys } from "@/services/api/queryKeys";

/**
 * 拉取全部状态的愿景（size 取后端上限 500），
 * 用于筛选选项的计数展示。与按状态筛选的渲染列表使用不同的
 * query key，独立缓存、互不影响。
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

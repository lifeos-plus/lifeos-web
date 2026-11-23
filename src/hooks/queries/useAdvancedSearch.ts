import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import {
  usePaginatedSearch,
  type PaginatedSearchResult,
} from "./usePaginatedSearch";
import {
  timelogsApi,
  type TimelogAdvancedSearchMetadata,
} from "@/services/api/timelogs";
import { sortTimeEntriesByTime } from "@/utils/datetime";
import { timelogsKeys } from "@/services/api/queryKeys";
import type {
  TimelogAdvancedSearchRequest,
  Timelog,
} from "@/services/api/timelogs";

export interface AdvancedSearchParams extends TimelogAdvancedSearchRequest {
  sort_order?: "asc" | "desc";
}

const BASE_OPTIONS = {
  queryKey: (params: AdvancedSearchParams) =>
    timelogsKeys.advancedSearch(params),
  idleKey: [...timelogsKeys.all, "advanced-search", "idle"] as const,
  staleTime: 30 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

export function useAdvancedSearchWithPagination(
  pageSize: number = 100,
): PaginatedSearchResult<Timelog, AdvancedSearchParams, Error> & {
  metadata: TimelogAdvancedSearchMetadata | null;
} {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [metadata, setMetadata] =
    useState<TimelogAdvancedSearchMetadata | null>(null);
  const metadataMapRef = useRef<
    Record<string, TimelogAdvancedSearchMetadata>
  >({});

  const buildSignature = useCallback((params: AdvancedSearchParams) => {
    return JSON.stringify(params);
  }, []);

  const searchResult = usePaginatedSearch<Timelog, AdvancedSearchParams>({
    ...BASE_OPTIONS,
    pageSize,
    queryFn: async (params: AdvancedSearchParams) => {
      const response = await timelogsApi.advancedSearch(params);
      const signature = buildSignature(params);
      metadataMapRef.current[signature] = response.meta;

      // The API has no ordering parameter, so mirror the day view: sort by
      // start/end time and reverse for descending.
      if (!params.sort_order) {
        return response.items;
      }
      const sorted = sortTimeEntriesByTime([...response.items]);
      return params.sort_order === "desc" ? sorted.reverse() : sorted;
    },
    onError: (error) => {
      const message =
        error?.message || t("timeLog.messages.loadingAdvancedQueryFailed");
      showError(t("timeLog.messages.queryFailed"), message);
    },
  });

  const {
    clearSearch: baseClearSearch,
    searchParams,
    ...restResult
  } = searchResult;

  const clearSearch = useCallback(() => {
    baseClearSearch();
    setMetadata(null);
    // Keep the metadata cache: a repeated search can be served from the query
    // cache without re-running queryFn, and the banner would otherwise vanish.
  }, [baseClearSearch]);

  useEffect(() => {
    if (!searchParams) {
      setMetadata(null);
      return;
    }
    const signature = buildSignature(searchParams);
    setMetadata(metadataMapRef.current[signature] ?? null);
  }, [searchParams, buildSignature, searchResult.data]);

  return {
    ...restResult,
    clearSearch,
    searchParams,
    metadata,
  };
}

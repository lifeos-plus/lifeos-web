/**
 * Utilities for building counted filter options.
 *
 * Appends "(n)" counts to static filter options (e.g. status) and sorts
 * them by count descending. The sort is stable, so ties keep the original
 * order of the base options.
 */
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";

/** Value of the "All" option; reuses the shared selector special value. */
export const ALL_FILTER_VALUE = SelectorSpecialValue.All;

export interface CountableFilterOption {
  value: string;
  label: string;
}

/**
 * Build a counted and sorted option list from base options.
 *
 * @param baseOptions Base options preserving their semantic order
 * @param countsByValue Object count per option value
 * @param allOption Optional "All" option prepended with the total count
 * @returns Options labelled like "Active (3)", sorted by count descending
 */
export function buildCountedFilterOptions(
  baseOptions: CountableFilterOption[],
  countsByValue: Map<string, number> | Record<string, number>,
  allOption?: { allLabel: string; totalCount: number },
): CountableFilterOption[] {
  const counts =
    countsByValue instanceof Map
      ? countsByValue
      : new Map(Object.entries(countsByValue));

  const counted = baseOptions
    .map((option) => ({
      ...option,
      count: counts.get(option.value) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .map((option) => ({
      value: option.value,
      label: `${option.label} (${option.count})`,
    }));

  if (!allOption) {
    return counted;
  }

  return [
    {
      value: ALL_FILTER_VALUE,
      label: `${allOption.allLabel} (${allOption.totalCount})`,
    },
    ...counted,
  ];
}

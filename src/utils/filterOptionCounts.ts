/**
 * 筛选选项计数工具。
 *
 * 为 EnumSelect 之类的静态筛选选项附加 "(n)" 计数，并按计数降序排列
 * （n 相同时保持原有顺序，排序是稳定的）。
 */

/** "全部" 选项的固定 value（与 SelectorSpecialValue.All 保持一致）。 */
export const ALL_FILTER_VALUE = "__all__";

export interface CountableFilterOption {
  value: string;
  label: string;
}

/**
 * 为筛选选项构建带计数与排序的选项列表。
 *
 * @param baseOptions 基础选项（如状态选项），保持原有语义顺序
 * @param countsByValue 各 value 对应的对象数量
 * @param allOption 可选：在最前面插入"全部"选项（计数为 totalCount）
 * @returns 每个选项 label 形如 "Active (3)"，按计数降序排列
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

import { useMemo } from "react";
import EnumSelect from "@/components/selects/EnumSelect";
import type { SelectorValue } from "@/components/selects/selectorTypes";
import {
  DEFAULT_MAYAN_NEW_YEAR_START,
  parseMayanNewYearStart,
} from "@/utils/calendar";

export interface MayanNewYearStartPreferenceProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onSave: (value: unknown) => Promise<boolean>;
  onCommit: (value: unknown) => Promise<boolean>;
  saving: boolean;
  loading: boolean;
  disabled: boolean;
  id: string;
  "aria-describedby"?: string;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const formatMonthDay = (month: number, day: number): string =>
  `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const MayanNewYearStartPreference = ({
  value,
  onChange: _onChange,
  onSave: _onSave,
  onCommit,
  saving,
  loading,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
}: MayanNewYearStartPreferenceProps) => {
  const current = parseMayanNewYearStart(
    typeof value === "string" && /^\d{2}-\d{2}$/.test(value)
      ? value
      : DEFAULT_MAYAN_NEW_YEAR_START,
  );
  const [month, day] = current;

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: String(index + 1),
      })),
    [],
  );

  const dayOptions = useMemo(() => {
    const maxDay = DAYS_IN_MONTH[month - 1];
    return Array.from({ length: maxDay }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    }));
  }, [month]);

  const commit = (nextMonth: number, nextDay: number) => {
    const maxDay = DAYS_IN_MONTH[nextMonth - 1];
    void onCommit(formatMonthDay(nextMonth, Math.min(nextDay, maxDay)));
  };

  const isDisabled = loading || saving || disabled;

  return (
    <div className="flex items-center gap-2">
      <EnumSelect
        id={`${id}-month`}
        value={String(month)}
        options={monthOptions}
        onChange={(next: SelectorValue) => {
          const nextMonth = Number(next);
          if (Number.isInteger(nextMonth) && nextMonth >= 1 && nextMonth <= 12) {
            commit(nextMonth, day);
          }
        }}
        disabled={isDisabled}
        aria-describedby={ariaDescribedBy}
        className="text-sm w-24"
        autoWidth
      />
      <span aria-hidden>-</span>
      <EnumSelect
        id={`${id}-day`}
        value={String(day)}
        options={dayOptions}
        onChange={(next: SelectorValue) => {
          const nextDay = Number(next);
          if (Number.isInteger(nextDay) && nextDay >= 1 && nextDay <= 31) {
            commit(month, nextDay);
          }
        }}
        disabled={isDisabled}
        className="text-sm w-24"
        autoWidth
      />
    </div>
  );
};

export default MayanNewYearStartPreference;

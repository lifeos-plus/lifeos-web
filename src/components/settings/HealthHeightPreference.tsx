import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NumericInput } from "@/components/forms";

export const HEALTH_HEIGHT_MIN_CM = 50;
export const HEALTH_HEIGHT_MAX_CM = 300;

interface HealthHeightPreferenceProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onSave: (value: unknown) => Promise<boolean>;
  onCommit: (value: unknown) => Promise<boolean>;
  saving: boolean;
  loading: boolean;
  disabled: boolean;
  id: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

const clampHeight = (value: number) => {
  if (Number.isNaN(value)) return null;
  if (value < HEALTH_HEIGHT_MIN_CM) return HEALTH_HEIGHT_MIN_CM;
  if (value > HEALTH_HEIGHT_MAX_CM) return HEALTH_HEIGHT_MAX_CM;
  return Math.round(value);
};

const HealthHeightPreference = ({
  value,
  onChange: _onChange,
  onSave: _onSave,
  onCommit,
  saving,
  loading,
  disabled,
  id,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: HealthHeightPreferenceProps) => {
  const { t } = useTranslation();

  const numericValue = useMemo(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return clampHeight(parsed);
      }
    }
    return null;
  }, [value]);

  const handleCommit = useCallback(
    (nextValue: number | null) => onCommit(nextValue),
    [onCommit],
  );

  return (
    <NumericInput
      id={id}
      value={numericValue}
      min={HEALTH_HEIGHT_MIN_CM}
      max={HEALTH_HEIGHT_MAX_CM}
      allowEmpty
      allowClear
      clearLabel={t("settings.health.bodyHeight.clear")}
      placeholder={t("settings.health.bodyHeight.placeholder")}
      onCommit={handleCommit}
      disabled={loading || saving || disabled}
      ariaLabelledBy={ariaLabelledBy}
      ariaDescribedBy={ariaDescribedBy}
    />
  );
};

export default HealthHeightPreference;

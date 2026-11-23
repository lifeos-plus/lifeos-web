import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NumericInput } from "@/components/forms";
import { VISION_EXPERIENCE_RATE_MAX } from "@/utils/constants";

interface VisionExperienceDefaultPreferenceProps {
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

const clampRate = (value: number) => {
  if (Number.isNaN(value)) return null;
  if (value < 1) return 1;
  if (value > VISION_EXPERIENCE_RATE_MAX) return VISION_EXPERIENCE_RATE_MAX;
  return Math.round(value);
};

const VisionExperienceDefaultPreference = ({
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
}: VisionExperienceDefaultPreferenceProps) => {
  const { t } = useTranslation();

  const numericValue = useMemo(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return clampRate(parsed) ?? null;
      }
    }
    return null;
  }, [value]);

  const handleCommit = useCallback(
    (nextValue: number | null) => onCommit(nextValue),
    [onCommit],
  );

  return (
    <div className="space-y-3">
      <NumericInput
        id={id}
        value={numericValue}
        min={1}
        max={VISION_EXPERIENCE_RATE_MAX}
        allowEmpty={false}
        onCommit={handleCommit}
        disabled={loading || saving || disabled}
        ariaLabelledBy={ariaLabelledBy}
      ariaDescribedBy={ariaDescribedBy}
      />
      <p className="text-xs text-base-content/60">
        {saving ? t("common.saving") : t("settings.autoSaveHint")}
      </p>
    </div>
  );
};

export default VisionExperienceDefaultPreference;

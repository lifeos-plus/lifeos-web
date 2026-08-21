import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ActionButton from "@/components/ActionButton";
import TextInput from "@/components/forms/TextInput";

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

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw.trim() === "") {
        return;
      }
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        return;
      }
      const normalized = clampHeight(parsed);
      if (normalized !== null) {
        void onCommit(normalized);
      }
    },
    [onCommit],
  );

  const handleClear = useCallback(() => {
    void onCommit(null);
  }, [onCommit]);

  return (
    <div className="flex items-center gap-2">
      <TextInput
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={t("settings.health.bodyHeight.placeholder")}
        value={numericValue === null ? "" : String(numericValue)}
        onChange={handleInputChange}
        disabled={loading || saving || disabled}
        aria-describedby={ariaDescribedBy}
      />
      {numericValue !== null ? (
        <ActionButton
          label=""
          ariaLabel={t("settings.health.bodyHeight.clear")}
          iconName="x-mark"
          iconOnly
          shape="square"
          size="sm"
          variant="ghost"
          onClick={handleClear}
          disabled={loading || saving || disabled}
        />
      ) : null}
    </div>
  );
};

export default HealthHeightPreference;

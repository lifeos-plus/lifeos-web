import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/forms/TextInput";
import { normalizeMayanNewYearStart } from "@/utils/calendar";

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

const MONTH_DAY_PATTERN = /^\d{2}-\d{2}$/;
const DRAFT_PATTERN = /^\d{0,2}-?\d{0,2}$/;

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
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string>(() =>
    normalizeMayanNewYearStart(value),
  );

  useEffect(() => {
    setDraft(normalizeMayanNewYearStart(value));
  }, [value]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (!DRAFT_PATTERN.test(raw)) {
        return;
      }
      setDraft(raw);
      if (MONTH_DAY_PATTERN.test(raw)) {
        void onCommit(normalizeMayanNewYearStart(raw));
      }
    },
    [onCommit],
  );

  return (
    <TextInput
      id={id}
      type="text"
      inputMode="numeric"
      pattern="\d{2}-\d{2}"
      placeholder={t("settings.calendar.mayanNewYearStart.placeholder")}
      value={draft}
      onChange={handleInputChange}
      disabled={loading || saving || disabled}
      aria-describedby={ariaDescribedBy}
    />
  );
};

export default MayanNewYearStartPreference;

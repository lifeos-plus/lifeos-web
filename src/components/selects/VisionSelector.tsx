import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVisions } from "@/hooks/queries/useVisions";
import { useDefaultInboxVision } from "@/hooks/queries/useDefaultInboxVision";
import type { Vision } from "@/services/api";
import AsyncEntitySelect from "./AsyncEntitySelect";
import type { SelectorValue } from "./selectorTypes";
import type { UUID } from "@/types/primitive";

type SelectSize = "sm" | "md" | "lg";

interface VisionSelectorProps {
  value?: string | null;
  onChange: (visionId: UUID | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: SelectSize;
  className?: string;
  allowUndefined?: boolean; // when true, empty value maps to null
  fullWidth?: boolean;
  idPrefix?: string;
  label?: string;
  showLabel?: boolean;
  showDefaultOption?: boolean;
  defaultToInboxVision?: boolean;
  filterStatus?: string[];
  showStatus?: boolean; // whether to show status prefix in format [status]title (default: false)
  error?: string | null;
}

// Stable default to avoid creating a new array on every render
const DEFAULT_VISION_FILTER_STATUS: string[] = ["active"];

const VisionSelector: React.FC<VisionSelectorProps> = React.memo(
  ({
    value,
    onChange,
    placeholder,
    disabled = false,
    size = "sm",
    className = "",
    allowUndefined = true,
    fullWidth = true,
    idPrefix = "vision-select",
    label,
    showLabel = false,
    showDefaultOption = false,
    defaultToInboxVision = false,
    filterStatus = DEFAULT_VISION_FILTER_STATUS,
    showStatus = false,
    error,
  }) => {
    const { t } = useTranslation();
    const hasAutoSelectedRef = useRef(false);

    const finalPlaceholder = placeholder || t("common.please_select");

    const {
      defaultInboxVision,
      loading: defaultVisionLoading,
      error: defaultVisionError,
    } = useDefaultInboxVision();

    const {
      visions,
      loading: loadingVisions,
      error: visionsError,
    } = useVisions({ ttlMs: 5 * 60 * 1000 });

    const availableVisions = useMemo(() => {
      const all = (visions as Vision[]) || [];
      if (!filterStatus || filterStatus.length === 0) {
        return all;
      }
      return all.filter((v) => filterStatus.includes(v.status));
    }, [visions, filterStatus]);

    useEffect(() => {
      if (
        defaultToInboxVision &&
        defaultInboxVision &&
        value === null &&
        !loadingVisions &&
        !defaultVisionLoading &&
        !hasAutoSelectedRef.current
      ) {
        hasAutoSelectedRef.current = true;
        onChange(defaultInboxVision);
      }
    }, [
      defaultToInboxVision,
      defaultInboxVision,
      value,
      loadingVisions,
      defaultVisionLoading,
      onChange,
    ]);

    const options = useMemo(() => {
      const items: {
        id: UUID | string;
        label: string;
        disabled?: boolean;
      }[] = [];

      if (showDefaultOption && defaultInboxVision) {
        const def = availableVisions.find((v) => v.id === defaultInboxVision);
        if (def) {
          items.push({
            id: defaultInboxVision,
            label: `${def.name} (${t("common.default")})`,
          });
        }
      }

      // Do NOT add an extra empty option when allowUndefined is true,
      // AsyncEntitySelect already renders an empty placeholder as a separate item.
      if (!allowUndefined) {
        items.push({ id: "", label: finalPlaceholder });
      }

      availableVisions.forEach((v) => {
        if (showDefaultOption && v.id === defaultInboxVision) return;

        const label = showStatus
          ? `[${t(`status.${v.status}`)}] ${v.name}`
          : v.name;

        items.push({ id: v.id, label });
      });

      return items;
    }, [
      availableVisions,
      allowUndefined,
      finalPlaceholder,
      showDefaultOption,
      defaultInboxVision,
      showStatus,
      t,
    ]);

    const handleChange = (val: SelectorValue) => {
      if (val === undefined || val === "") {
        onChange(allowUndefined ? null : "");
        return;
      }
      const parsed = typeof val === "string" ? val : String(val);
      onChange(parsed);
    };

    const hasError = error || visionsError || defaultVisionError;
    const errorMessage = error || visionsError || defaultVisionError;

    return (
      <div className={`flex flex-col ${fullWidth ? "w-full" : ""}`}>
        <AsyncEntitySelect
          value={value ?? (allowUndefined ? undefined : "")}
          onChange={handleChange}
          options={options}
          placeholder={finalPlaceholder}
          disabled={disabled || loadingVisions || defaultVisionLoading}
          size={size}
          className={className}
          allowUndefined={allowUndefined}
          fullWidth={fullWidth}
          idPrefix={idPrefix}
          label={label}
          showLabel={showLabel}
          usePortal
        />
        {hasError && (
          <div className="label">
            <span className="text-xs text-error">
              {errorMessage}
            </span>
          </div>
        )}
      </div>
    );
  },
);

VisionSelector.displayName = "VisionSelector";

export default VisionSelector;

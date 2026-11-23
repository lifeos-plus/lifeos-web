import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ActionButton from "@/components/ActionButton";
import TextInput from "./TextInput";

type NumericInputSize = "sm" | "md" | "lg";

interface NumericInputProps {
  id?: string;
  name?: string;
  value: number | null;
  /**
   * Called once the edit settles (blur or Enter), never on every keystroke.
   * The value is rounded and clamped to `min`/`max` before the commit.
   */
  onCommit: (value: number | null) => void | Promise<unknown>;
  min?: number;
  max?: number;
  /** Allow an empty field, committing `null`. Defaults to true. */
  allowEmpty?: boolean;
  /** Render a clear (x) button while a value is present. */
  allowClear?: boolean;
  clearLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: NumericInputSize;
  className?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const formatValue = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? "" : String(Math.round(value));

const normalizeValue = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  let next = Math.round(value);
  if (typeof min === "number" && next < min) next = min;
  if (typeof max === "number" && next > max) next = max;
  return next;
};

/**
 * Integer text input that keeps a local draft while the user types and only
 * commits the normalized value on blur/Enter.
 *
 * Scope: whole numbers only. Decimal amounts, currency, and formatted values
 * (e.g. hhmm durations or comma-separated day lists) have different input
 * semantics and should keep their form-local string state instead.
 *
 * Committing on every keystroke (the previous behavior) made these inputs
 * unusable: the parent disabled the field while the save was in flight, which
 * dropped focus after the first digit, and eager clamping rewrote partial
 * input (typing "170" became 50 -> 507 -> 300).
 */
const NumericInput = ({
  id,
  name,
  value,
  onCommit,
  min,
  max,
  allowEmpty = true,
  allowClear = false,
  clearLabel,
  placeholder,
  disabled = false,
  size = "md",
  className,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: NumericInputProps) => {
  const [text, setText] = useState(() => formatValue(value));
  const textRef = useRef(text);
  const dirtyRef = useRef(false);

  const writeText = useCallback((next: string) => {
    textRef.current = next;
    setText(next);
  }, []);

  // Follow external value changes (load, optimistic update, failed-save
  // rollback) unless the user is in the middle of an edit.
  useEffect(() => {
    if (dirtyRef.current) return;
    writeText(formatValue(value));
  }, [value, writeText]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/[^\d]/g, "");
    dirtyRef.current = true;
    writeText(digits);
  };

  const commit = useCallback(async () => {
    const raw = textRef.current.trim();
    dirtyRef.current = false;

    if (raw === "") {
      if (allowEmpty) {
        if (value !== null) {
          await onCommit(null);
        }
        return;
      }
      writeText(formatValue(value));
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      writeText(formatValue(value));
      return;
    }

    const normalized = normalizeValue(parsed, min, max);
    writeText(String(normalized));
    if (normalized !== value) {
      await onCommit(normalized);
    }
  }, [allowEmpty, max, min, onCommit, value, writeText]);

  const handleBlur = () => {
    void commit();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      dirtyRef.current = false;
      writeText(formatValue(value));
    }
  };

  const handleClear = () => {
    dirtyRef.current = false;
    writeText("");
    void onCommit(null);
  };

  const input = (
    <TextInput
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      size={size}
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    />
  );

  if (!allowClear) {
    return input;
  }

  return (
    <div className="flex items-center gap-2">
      {input}
      {value !== null ? (
        <span onMouseDown={(event) => event.preventDefault()}>
          <ActionButton
            label=""
            ariaLabel={clearLabel}
            iconName="x-mark"
            iconOnly
            shape="square"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={disabled}
          />
        </span>
      ) : null}
    </div>
  );
};

export default NumericInput;

import { financeTextClass } from "./styles";

type FinanceAmountTextProps = {
  amount: string;
  currencyCode?: string | null;
  value?: number | null;
  showCurrency?: boolean;
  className?: string;
};

type FinanceAmountListTextProps = {
  items: FinanceAmountListItem[];
  className?: string;
};

type FinanceAssetSymbolProps = {
  symbol: string;
  className?: string;
  inheritTone?: boolean;
};

export type FinanceAmountListItem = {
  amount: string;
  currencyCode: string;
};

const subduedTextClass = "font-normal opacity-65";

export function FinanceAmountText({
  amount,
  currencyCode,
  value,
  showCurrency = true,
  className = "",
}: FinanceAmountTextProps) {
  const rawText = amount.trim();
  if (!rawText) {
    return (
      <span className={[financeTextClass.placeholder, className].filter(Boolean).join(" ")}>
        -
      </span>
    );
  }

  const text = trimInsignificantFractionZeroes(rawText);
  const numericValue = typeof value === "number" ? value : parseNumericAmount(text);
  const toneClass =
    Number.isFinite(numericValue) && numericValue < 0 ? "text-warning" : "text-base-content";
  const symbol = currencyCode?.trim().toUpperCase();

  return (
    <span
      className={[
        "inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums",
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{text}</span>
      {showCurrency && symbol ? <FinanceAssetSymbol symbol={symbol} inheritTone /> : null}
    </span>
  );
}

export function FinanceAmountListText({ items, className = "" }: FinanceAmountListTextProps) {
  if (!items.length) {
    return (
      <span className={[financeTextClass.placeholder, className].filter(Boolean).join(" ")}>
        -
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item, index) => (
        <span
          key={`${item.amount}:${item.currencyCode}:${index}`}
          className="inline-flex items-baseline gap-1"
        >
          {index > 0 ? <span className={financeTextClass.placeholder}>,</span> : null}
          <FinanceAmountText amount={item.amount} currencyCode={item.currencyCode} />
        </span>
      ))}
    </span>
  );
}

export function FinanceAssetSymbol({
  symbol,
  className = "",
  inheritTone = false,
}: FinanceAssetSymbolProps) {
  return (
    <span
      className={[
        "whitespace-nowrap",
        inheritTone ? "" : "text-base-content",
        subduedTextClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {symbol.trim().toUpperCase()}
    </span>
  );
}

function parseNumericAmount(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function trimInsignificantFractionZeroes(value: string): string {
  const normalized = value.trim();
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(normalized)) {
    return value;
  }
  const separator = normalized.includes(".") ? "." : ",";
  const [integerPart, fractionPart] = normalized.split(separator);
  if (!fractionPart) {
    return normalized;
  }
  const trimmedFraction = fractionPart.replace(/0+$/, "");
  return trimmedFraction ? `${integerPart}${separator}${trimmedFraction}` : integerPart;
}

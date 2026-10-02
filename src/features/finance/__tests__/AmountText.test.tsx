import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinanceAmountListText, FinanceAmountText } from "@/features/finance/AmountText";

describe("FinanceAmountText", () => {
  it("keeps numeric text visually continuous and trims insignificant zeroes", () => {
    render(<FinanceAmountText amount="123.4500" currencyCode="USD" />);

    expect(screen.getByText("123.45").className).not.toContain("font-");
    expect(screen.queryByText(".4500")).toBeNull();
    expect(screen.getByText("USD").className).toContain("opacity-65");
    expect(screen.getByText("123.45").parentElement?.className).toContain(
      "text-base-content",
    );
    expect(screen.getByText("123.45").parentElement?.className).not.toContain("text-warning");
  });

  it("uses warning text color for negative values", () => {
    render(<FinanceAmountText amount="-42.50" currencyCode="CNY" />);

    expect(screen.getByText("-42.5").parentElement?.className).toContain("text-warning");
    expect(screen.getByText("CNY").className).not.toContain("text-base-content");
  });
});

describe("FinanceAmountListText", () => {
  it("renders structured amount items with the shared amount style", () => {
    render(
      <FinanceAmountListText
        items={[
          { amount: "10.00", currencyCode: "USD" },
          { amount: "-2.50", currencyCode: "BTC" },
        ]}
      />,
    );

    const usd = screen.getByText("USD");
    const btc = screen.getByText("BTC");

    expect(
      within(usd.parentElement as HTMLElement).getByText("10").className,
    ).not.toContain("font-");
    expect(
      within(btc.parentElement as HTMLElement).getByText("-2.5").parentElement?.className,
    ).toContain("text-warning");
  });
});

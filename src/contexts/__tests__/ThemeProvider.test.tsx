import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/contexts/ThemeProvider";
import { useTheme } from "@/contexts/ThemeContext";
import { renderWithProviders } from "@test/utils";

const getWithMetaMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: {
    getWithMeta: getWithMetaMock,
    set: vi.fn(),
  },
}));

function ThemeProbe() {
  const { availableThemes, theme } = useTheme();
  return (
    <div data-testid="probe">{`${theme}|${availableThemes.join(",")}`}</div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    getWithMetaMock.mockReset();
  });

  it("derives selectable themes from the contract meta", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "appearance.theme",
      value: "night",
      meta: { allowed_values: ["system", "night"] },
    });

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("probe")).toHaveTextContent(
        "night|system,night",
      );
    });
  });

  it("falls back to the renderable themes when the contract has no meta", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "appearance.theme",
      value: "system",
      meta: undefined,
    });

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toContain(
        "system|system,fresh,cupcake",
      );
    });
  });
});

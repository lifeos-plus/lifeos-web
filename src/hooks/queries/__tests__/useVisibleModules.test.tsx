import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MODULES } from "@/config/modulesConfig";
import { setupTranslationMock } from "@test/utils";

setupTranslationMock();

const getWithMetaMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: {
    getWithMeta: getWithMetaMock,
    set: vi.fn(),
  },
}));

import { useVisibleModules } from "@/hooks/queries/useVisibleModules";

const defaultVisibleKeys = MODULES.filter((module) => module.showInNav).map(
  (module) => module.key,
);

describe("useVisibleModules", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    getWithMetaMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("loads the value and its allowlist from a single request", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "navigation.visible_modules",
      value: ["visions"],
      meta: { allowed_values: ["visions", "notes"] },
    });

    const { result } = renderHook(() => useVisibleModules(), { wrapper });

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));
    await waitFor(() => expect(result.current.visibleKeys).toEqual(["visions"]));

    expect(getWithMetaMock).toHaveBeenCalledTimes(1);
    expect(
      result.current.allConfigurableModules.map((module) => module.key),
    ).toEqual(["visions", "notes"]);
  });

  it("falls back to the default modules when the contract has no meta", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "navigation.visible_modules",
      value: undefined,
      meta: undefined,
    });

    const { result } = renderHook(() => useVisibleModules(), { wrapper });

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));
    await waitFor(() =>
      expect(result.current.visibleKeys).toEqual(defaultVisibleKeys),
    );
  });

  it("drops keys outside the allowlist before updating", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "navigation.visible_modules",
      value: ["visions"],
      meta: { allowed_values: ["visions", "notes"] },
    });

    const { result } = renderHook(() => useVisibleModules(), { wrapper });

    await waitFor(() => expect(result.current.visibleKeys).toEqual(["visions"]));

    act(() => {
      result.current.updateVisibleKeys(["visions", "bogus"]);
    });

    await waitFor(() => expect(result.current.visibleKeys).toEqual(["visions"]));
  });

  it("filters stored keys that the contract no longer lists", async () => {
    getWithMetaMock.mockResolvedValue({
      key: "navigation.visible_modules",
      value: ["visions", "retired_module"],
      meta: { allowed_values: ["visions", "notes"] },
    });

    const { result } = renderHook(() => useVisibleModules(), { wrapper });

    await waitFor(() => expect(result.current.visibleKeys).toEqual(["visions"]));
    expect(
      result.current.allConfigurableModules.map((module) => module.key),
    ).toEqual(["visions", "notes"]);
  });
});

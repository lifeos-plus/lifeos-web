import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLanguage } from "@/hooks/useLanguage";

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: {
    getWithMeta: vi.fn().mockResolvedValue({ value: "auto" }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useLanguage", () => {
  it("bootstraps without crashing and exposes the current language", async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(typeof result.current.currentLanguage).toBe("string");
  });

  it("keeps the stored auto preference instead of the detected language", async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));
    expect(result.current.currentLanguage).toBe("auto");
  });

  it("reflects a locally selected language", async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));

    await act(async () => {
      await result.current.changeLanguage("zh");
    });

    expect(result.current.currentLanguage).toBe("zh");
  });
});

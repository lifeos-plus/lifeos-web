import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
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
});

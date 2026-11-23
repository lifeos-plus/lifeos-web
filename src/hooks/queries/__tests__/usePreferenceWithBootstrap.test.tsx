import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { usePreferenceWithBootstrap } from "@/hooks/queries/usePreferenceWithBootstrap";

const getWithMetaMock = vi.fn();
const setPreferenceMock = vi.fn();

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: {
    getWithMeta: (...args: unknown[]) => getWithMetaMock(...args),
    set: (...args: unknown[]) => setPreferenceMock(...args),
  },
}));

const loggerWarnMock = vi.fn();

vi.mock("@/utils/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/core")>();
  return {
    ...actual,
    logger: {
      warn: (...args: unknown[]) => loggerWarnMock(...args),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  };
});

describe("usePreferenceWithBootstrap", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    getWithMetaMock.mockReset();
    setPreferenceMock.mockReset();
    loggerWarnMock.mockReset();
  });

  it("adopts backend value once bootstrapped", async () => {
    getWithMetaMock.mockResolvedValue({ value: "backend", meta: {} });

    const { result } = renderHook(
      () =>
        usePreferenceWithBootstrap({
          key: "sample.pref",
          defaultValue: "default",
        }),
      { wrapper },
    );

    await waitFor(() => expect(getWithMetaMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.bootstrapped).toBe(true));
    await waitFor(() => expect(result.current.value).toBe("backend"));
    expect(result.current.loading).toBe(false);
  });

  it("falls back to default when validator rejects backend value", async () => {
    getWithMetaMock.mockResolvedValue({ value: 99, meta: {} });

    const { result } = renderHook(
      () =>
        usePreferenceWithBootstrap<number>({
          key: "number.pref",
          defaultValue: 1,
          validator: (value) => value < 10,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));
    expect(result.current.value).toBe(1);
    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it("saves updated value via preferences API", async () => {
    getWithMetaMock.mockResolvedValue({ value: "backend", meta: {} });
    setPreferenceMock.mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () =>
        usePreferenceWithBootstrap({
          key: "sample.pref",
          defaultValue: "default",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));

    act(() => {
      result.current.updateValue("local-change");
    });

    let success = false;
    await act(async () => {
      success = await result.current.saveValue("persisted");
    });

    expect(success).toBe(true);
    expect(setPreferenceMock).toHaveBeenCalledWith(
      "sample.pref",
      "persisted",
      "general",
    );
    expect(invalidateSpy).toHaveBeenCalled();
    invalidateSpy.mockRestore();
  });

  it("stays loading until the real response replaces the placeholder", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    getWithMetaMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(
      () =>
        usePreferenceWithBootstrap({
          key: "sample.pref",
          defaultValue: "default",
        }),
      { wrapper },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.bootstrapped).toBe(false);

    await act(async () => {
      resolveFetch?.({ value: "backend", meta: {} });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.value).toBe("backend");
  });

  it("keeps a save error after the failed write rolls back", async () => {
    getWithMetaMock.mockResolvedValue({ value: "backend", meta: {} });
    setPreferenceMock.mockRejectedValue(new Error("save failed"));

    const { result } = renderHook(
      () =>
        usePreferenceWithBootstrap({
          key: "sample.pref",
          defaultValue: "default",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.bootstrapped).toBe(true));

    act(() => {
      result.current.updateValue("local-change");
    });

    let success = true;
    await act(async () => {
      success = await result.current.saveValue("local-change");
    });

    expect(success).toBe(false);
    await waitFor(() => expect(result.current.error).toBe("save failed"));
    await waitFor(() => expect(result.current.value).toBe("backend"));
  });
});

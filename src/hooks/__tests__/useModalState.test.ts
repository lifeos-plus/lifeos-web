import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useModalState } from "@/hooks/useModalState";

describe("useModalState", () => {
  it("keeps the Error message for thrown Error instances", async () => {
    const { result } = renderHook(() => useModalState());

    await act(async () => {
      await result.current
        .withLoading(() => Promise.reject(new Error("boom")))
        .catch(() => undefined);
    });

    expect(result.current.error).toBe("boom");
  });

  it("falls back to the operation-failed message for non-Error throws", async () => {
    const { result } = renderHook(() => useModalState());

    await act(async () => {
      await result.current
        .withLoading(() => Promise.reject("plain string"))
        .catch(() => undefined);
    });

    expect(result.current.error).toBe("common.operationFailed");
  });
});

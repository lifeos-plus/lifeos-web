import { describe, expect, it } from "vitest";

import { arraysEqual } from "@/utils/core";

describe("arraysEqual", () => {
  it("treats the same reference as equal", () => {
    const value = [1, 2, 3];
    expect(arraysEqual(value, value)).toBe(true);
  });

  it("compares arrays by value", () => {
    expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(arraysEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(arraysEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(arraysEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it("handles null and undefined inputs", () => {
    expect(arraysEqual(null, null)).toBe(true);
    expect(arraysEqual(undefined, undefined)).toBe(true);
    expect(arraysEqual(null, undefined)).toBe(false);
    expect(arraysEqual([1], null)).toBe(false);
    expect(arraysEqual(undefined, [1])).toBe(false);
  });

  it("supports readonly and empty arrays", () => {
    const readonlyA: readonly number[] = [1, 2];
    const readonlyB: readonly number[] = [1, 2];
    expect(arraysEqual(readonlyA, readonlyB)).toBe(true);
    expect(arraysEqual([], [])).toBe(true);
  });
});

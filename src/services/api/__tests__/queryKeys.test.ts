import { describe, expect, it } from "vitest";
import { habitsKeys } from "@/services/api/queryKeys";
import {
  isHabitsAssociationsQuery,
  isHabitsListQuery,
  type QueryLike,
} from "@/services/api/queryPredicates";

describe("habitsKeys", () => {
  it("keeps the habit-task associations key distinct from list keys", () => {
    // Regression: the "All" status filter makes useHabits use
    // ["habits","list",{}]; habit-task associations previously reused that
    // key with an object payload, so useHabits returned a non-array and
    // crashed with "x.map is not a function".
    expect(habitsKeys.associations()).toEqual([
      "habits",
      "habit-task-associations",
    ]);
    expect(habitsKeys.associations()).not.toEqual(habitsKeys.list({}));
    expect(habitsKeys.associations()).not.toEqual(
      habitsKeys.list({ statusFilter: undefined }),
    );
    expect(habitsKeys.list({ statusFilter: undefined })).toEqual([
      "habits",
      "list",
      {},
    ]);
  });

  it("classifies the associations key only as an associations query", () => {
    const associationsKey = habitsKeys.associations();
    const listKey = habitsKeys.list({});

    expect(
      isHabitsAssociationsQuery({ queryKey: associationsKey } as QueryLike),
    ).toBe(true);
    expect(
      isHabitsAssociationsQuery({ queryKey: listKey } as QueryLike),
    ).toBe(false);
    expect(
      isHabitsListQuery({ queryKey: associationsKey } as QueryLike),
    ).toBe(false);
    expect(isHabitsListQuery({ queryKey: listKey } as QueryLike)).toBe(true);
  });
});

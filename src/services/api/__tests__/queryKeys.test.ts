import { describe, expect, it } from "vitest";
import { habitsKeys, notesKeys } from "@/services/api/queryKeys";
import {
  isHabitsAssociationsQuery,
  isHabitsListQuery,
  isNotesAssociatedListQuery,
  isNotesListQuery,
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

  it("keeps the notes associated-list key distinct from the infinite list key", () => {
    // Regression: useNotes uses a useInfiniteQuery under notesKeys.list
    // (InfiniteData shape); single-page "associated notes" queries must not
    // share that key or they corrupt the infinite list cache.
    expect(notesKeys.associatedList({ task_id: "task-1" })).toEqual([
      "notes",
      "associated-list",
      { task_id: "task-1" },
    ]);
    expect(notesKeys.associatedList({ task_id: "task-1" })).not.toEqual(
      notesKeys.list({ task_id: "task-1" }),
    );

    const associatedKey = notesKeys.associatedList({ task_id: "task-1" });
    expect(
      isNotesAssociatedListQuery({ queryKey: associatedKey } as QueryLike),
    ).toBe(true);
    expect(isNotesListQuery({ queryKey: associatedKey } as QueryLike)).toBe(
      false,
    );
    expect(
      isNotesAssociatedListQuery({
        queryKey: notesKeys.list({ task_id: "task-1" }),
      } as QueryLike),
    ).toBe(false);
  });
});

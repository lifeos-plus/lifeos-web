import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { habitsKeys } from "@/services/api/queryKeys";
import { invalidateHabitsLists } from "@/services/api/cacheInvalidation/habits";

describe("invalidateHabitsLists", () => {
  it("invalidates both habit list queries and the associations query", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(habitsKeys.list({ statusFilter: "active" }), []);
    queryClient.setQueryData(habitsKeys.list({ statusFilter: undefined }), []);
    queryClient.setQueryData(habitsKeys.associations(), { "task-1": [] });

    const pending = invalidateHabitsLists(queryClient);
    await pending;

    const listState = queryClient.getQueryState(
      habitsKeys.list({ statusFilter: "active" }),
    );
    const allListState = queryClient.getQueryState(
      habitsKeys.list({ statusFilter: undefined }),
    );
    const associationsState = queryClient.getQueryState(
      habitsKeys.associations(),
    );

    expect(listState?.isInvalidated).toBe(true);
    expect(allListState?.isInvalidated).toBe(true);
    expect(associationsState?.isInvalidated).toBe(true);
  });
});

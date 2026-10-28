import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateAreaOrder } from "@/services/api/cacheInvalidation/areas";
import { areasKeys } from "@/services/api/queryKeys";

describe("entity detail cache invalidation helpers", () => {
  let invalidateQueriesMock: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  beforeEach(() => {
    invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
    queryClient = {
      invalidateQueries: invalidateQueriesMock,
    } as unknown as QueryClient;
  });

  it("invalidates area order precisely", () => {
    invalidateAreaOrder(queryClient);

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: areasKeys.order(),
      exact: true,
    });
  });
});

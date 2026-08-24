import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { financeApi, type FinanceTree } from "@/services/api/finance";

describe("financeApi", () => {
  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("copies a finance tree through the atomic copy endpoint", async () => {
    const copiedTree: FinanceTree = {
      id: "tree-copy",
      name: "Personal Copy",
      primary_currency: "USD",
      display_order: 10,
      is_default: false,
      nodes: [],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(copiedTree));

    const result = await financeApi.copyTree("tree-source");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe(
      new URL(ENDPOINTS.FINANCE.TREE_COPY("tree-source"), "http://localhost").pathname,
    );
    expect(init.method).toBe("POST");
    expect(result).toEqual(copiedTree);
  });
});

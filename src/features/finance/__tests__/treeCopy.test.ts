import { describe, expect, it, vi } from "vitest";

import type { FinanceNodeCreate, FinanceTreeNode, FinanceTree } from "@/services/api/finance";

import { copyTreeName, duplicateTree, nodeCreatePayload } from "@/features/finance/treeCopy";

const sourceNodes: FinanceTreeNode[] = [
  {
    id: "node-assets",
    parent_id: null,
    name: "Assets",
    currency_code: "USD",
    path: "node-assets",
    depth: 0,
    display_order: 1,
  },
  {
    id: "node-cash",
    parent_id: "node-assets",
    name: "Cash",
    currency_code: null,
    path: "node-assets/node-cash",
    depth: 1,
    display_order: 2,
  },
];

const sourceTree: FinanceTree = {
  id: "tree-source",
  name: "Personal",
  primary_currency: "USD",
  display_order: 10,
  is_default: true,
  nodes: sourceNodes,
};

describe("copyTreeName", () => {
  it("appends the copy suffix to the source name", () => {
    expect(copyTreeName("Personal", [])).toBe("Personal Copy");
  });

  it("dedupes against existing tree names", () => {
    expect(copyTreeName("Personal", ["Personal Copy"])).toBe("Personal Copy 2");
    expect(copyTreeName("Personal", ["Personal Copy", "Personal Copy 2"])).toBe(
      "Personal Copy 3",
    );
  });

  it("does not clash with the source name itself", () => {
    expect(copyTreeName("Personal", ["Personal"])).toBe("Personal Copy");
  });
});

describe("nodeCreatePayload", () => {
  it("maps a source parent to the copied parent", () => {
    expect(nodeCreatePayload(sourceNodes[1]!, new Map([["node-assets", "copy-assets"]]))).toEqual(
      {
        name: "Cash",
        parent_id: "copy-assets",
        currency_code: null,
        display_order: 2,
      } satisfies FinanceNodeCreate,
    );
  });

  it("keeps root nodes root", () => {
    expect(nodeCreatePayload(sourceNodes[0]!, new Map())).toEqual({
      name: "Assets",
      parent_id: null,
      currency_code: "USD",
      display_order: 1,
    } satisfies FinanceNodeCreate);
  });
});

describe("duplicateTree", () => {
  it("creates the tree first, then replays nodes under remapped parents", async () => {
    const createTree = vi.fn().mockResolvedValue({
      id: "tree-copy",
      name: "Personal Copy",
      primary_currency: "USD",
      display_order: 10,
      is_default: false,
      nodes: null,
    } satisfies FinanceTree);
    const createNode = vi
      .fn()
      .mockImplementation(
        async (_treeId: string, payload: FinanceNodeCreate) =>
          ({
            id: payload.name === "Assets" ? "copy-assets" : "copy-cash",
            parent_id: payload.parent_id ?? null,
            name: payload.name,
            currency_code: payload.currency_code ?? null,
            path: "",
            depth: payload.parent_id ? 1 : 0,
            display_order: payload.display_order ?? 0,
          }) satisfies FinanceTreeNode,
      );
    const deleteTree = vi.fn().mockResolvedValue(undefined);

    const copied = await duplicateTree(
      { createTree, createNode, deleteTree },
      sourceTree,
      ["Personal"],
    );

    expect(copied.id).toBe("tree-copy");
    expect(createTree).toHaveBeenCalledWith({
      name: "Personal Copy",
      primary_currency: "USD",
      display_order: 10,
      is_default: false,
    });
    expect(createNode).toHaveBeenNthCalledWith(1, "tree-copy", {
      name: "Assets",
      parent_id: null,
      currency_code: "USD",
      display_order: 1,
    });
    expect(createNode).toHaveBeenNthCalledWith(2, "tree-copy", {
      name: "Cash",
      parent_id: "copy-assets",
      currency_code: null,
      display_order: 2,
    });
    expect(deleteTree).not.toHaveBeenCalled();
  });

  it("removes the partial tree when a node creation fails", async () => {
    const createTree = vi.fn().mockResolvedValue({
      id: "tree-copy",
      name: "Personal Copy",
      primary_currency: "USD",
      display_order: 10,
      is_default: false,
      nodes: null,
    } satisfies FinanceTree);
    const createNode = vi.fn().mockRejectedValue(new Error("node failed"));
    const deleteTree = vi.fn().mockResolvedValue(undefined);

    await expect(
      duplicateTree({ createTree, createNode, deleteTree }, sourceTree, []),
    ).rejects.toThrow("node failed");
    expect(deleteTree).toHaveBeenCalledWith("tree-copy");
  });
});

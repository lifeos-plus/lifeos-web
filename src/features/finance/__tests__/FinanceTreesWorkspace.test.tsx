import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModalProvider } from "@/contexts/ModalProvider";
import { FinanceTreesWorkspace } from "@/pages/FinancePage";
import type {
  FinanceAsset,
  FinanceAssetListResponse,
  FinanceNodeCreate,
  FinanceTree,
  FinanceTreeListResponse,
  FinanceTreeNode,
} from "@/services/api/finance";
import { renderWithProviders } from "@test/utils";

const financeApiMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listTrees: vi.fn(),
  getTree: vi.fn(),
  createTree: vi.fn(),
  createNode: vi.fn(),
  deleteTree: vi.fn(),
}));

vi.mock("@/services/api/finance", () => ({
  financeApi: financeApiMocks,
}));

const assetListResponse = (items: FinanceAsset[]): FinanceAssetListResponse => ({
  items,
  pagination: { page: 1, size: 200, total: items.length, pages: 1 },
  meta: {},
});

const treeListResponse = (items: FinanceTree[]): FinanceTreeListResponse => ({
  items,
  pagination: { page: 1, size: 100, total: items.length, pages: 1 },
  meta: {},
});

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

describe("FinanceTreesWorkspace", () => {
  beforeEach(() => {
    financeApiMocks.listAssets.mockResolvedValue(
      assetListResponse([
        {
          id: "asset-usd",
          code: "USD",
          name: "US Dollar",
          decimal_places: 2,
          is_default: true,
        },
      ]),
    );
    financeApiMocks.listTrees.mockResolvedValue(treeListResponse([sourceTree]));
    financeApiMocks.getTree.mockResolvedValue(sourceTree);
    financeApiMocks.createTree.mockImplementation(
      async (payload: Parameters<typeof financeApiMocks.createTree>[0]) =>
        ({
          id: "tree-copy",
          name: payload.name,
          primary_currency: payload.primary_currency,
          display_order: payload.display_order,
          is_default: payload.is_default ?? false,
          nodes: null,
        }) satisfies FinanceTree,
    );
    financeApiMocks.createNode.mockImplementation(
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
    financeApiMocks.deleteTree.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("copies the current tree and replays its nodes under remapped parents", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FinanceTreesWorkspace />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <ModalProvider>{children}</ModalProvider>
      ),
    });

    expect(await screen.findByText("Personal")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "common.copy" }));

    await waitFor(() => {
      expect(financeApiMocks.createTree).toHaveBeenCalledTimes(1);
    });
    expect(financeApiMocks.createTree).toHaveBeenCalledWith({
      name: "Personal Copy",
      primary_currency: "USD",
      display_order: 10,
      is_default: false,
    });

    await waitFor(() => {
      expect(financeApiMocks.createNode).toHaveBeenCalledTimes(2);
    });
    expect(financeApiMocks.createNode).toHaveBeenNthCalledWith(1, "tree-copy", {
      name: "Assets",
      parent_id: null,
      currency_code: "USD",
      display_order: 1,
    });
    expect(financeApiMocks.createNode).toHaveBeenNthCalledWith(2, "tree-copy", {
      name: "Cash",
      parent_id: "copy-assets",
      currency_code: null,
      display_order: 2,
    });
  });
});

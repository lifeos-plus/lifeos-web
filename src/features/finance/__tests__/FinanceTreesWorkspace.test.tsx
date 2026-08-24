import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModalProvider } from "@/contexts/ModalProvider";
import { FinanceTreesWorkspace } from "@/pages/FinancePage";
import type {
  FinanceAsset,
  FinanceAssetListResponse,
  FinanceTree,
  FinanceTreeListResponse,
} from "@/services/api/finance";
import { renderWithProviders } from "@test/utils";

const financeApiMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listTrees: vi.fn(),
  getTree: vi.fn(),
  createTree: vi.fn(),
  copyTree: vi.fn(),
  updateTree: vi.fn(),
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

const sourceTree: FinanceTree = {
  id: "tree-source",
  name: "Personal",
  primary_currency: "USD",
  display_order: 10,
  is_default: true,
  nodes: [],
};

const copiedTree: FinanceTree = {
  id: "tree-copy",
  name: "Personal Copy",
  primary_currency: "USD",
  display_order: 10,
  is_default: false,
  nodes: [],
};

const createdTree: FinanceTree = {
  id: "tree-created",
  name: "New Tree",
  primary_currency: "USD",
  display_order: 1000,
  is_default: false,
  nodes: [],
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
    financeApiMocks.listTrees
      .mockResolvedValueOnce(treeListResponse([sourceTree]))
      .mockResolvedValue(treeListResponse([sourceTree, copiedTree]));
    financeApiMocks.getTree.mockImplementation(async (treeId: string) =>
      treeId === "tree-source" ? sourceTree : copiedTree,
    );
    financeApiMocks.copyTree.mockResolvedValue(copiedTree);
    financeApiMocks.updateTree.mockResolvedValue(copiedTree);
    financeApiMocks.createTree.mockResolvedValue(createdTree);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("copies the current tree, activates the copy, and opens its edit form", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FinanceTreesWorkspace />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <ModalProvider>{children}</ModalProvider>
      ),
    });

    expect(await screen.findByText("Personal")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "common.copy" }));

    await waitFor(() => {
      expect(financeApiMocks.copyTree).toHaveBeenCalledTimes(1);
    });
    expect(financeApiMocks.copyTree).toHaveBeenCalledWith("tree-source");

    // The edit form opens automatically, pre-filled with the copy (not the source).
    expect(await screen.findByText("finance.tree.editTree")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Personal Copy")).toBeInTheDocument();

    // Saving keeps the copied tree as the target; the source is untouched.
    await user.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => {
      expect(financeApiMocks.updateTree).toHaveBeenCalledWith("tree-copy", {
        name: "Personal Copy",
        primary_currency: "USD",
        display_order: 10,
        is_default: false,
      });
    });
    expect(financeApiMocks.updateTree).toHaveBeenCalledTimes(1);
  });

  it("creates a tree through the API and selects it", async () => {
    financeApiMocks.listTrees.mockReset();
    financeApiMocks.listTrees.mockResolvedValue(
      treeListResponse([sourceTree, createdTree]),
    );
    financeApiMocks.getTree.mockImplementation(async (treeId: string) =>
      treeId === "tree-source" ? sourceTree : createdTree,
    );
    const user = userEvent.setup();

    renderWithProviders(<FinanceTreesWorkspace />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <ModalProvider>{children}</ModalProvider>
      ),
    });

    expect(await screen.findByText("Personal")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "finance.tree.createTree" }),
    );

    await user.type(
      await screen.findByPlaceholderText("finance.tree.treeNamePlaceholder"),
      "New Tree",
    );
    await user.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() => {
      expect(financeApiMocks.createTree).toHaveBeenCalledWith({
        name: "New Tree",
        primary_currency: "USD",
        display_order: 1000,
        is_default: false,
      });
    });

    // The newly created tree is activated.
    expect(await screen.findByText("New Tree")).toBeInTheDocument();
  });
});

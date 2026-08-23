import type {
  FinanceNodeCreate,
  FinanceTree,
  FinanceTreeNode,
} from "@/services/api/finance";
import type { UUID } from "@/types/primitive";

/**
 * Client-side finance tree duplication.
 *
 * The Web UI consumes the pinned lifeos-cli OpenAPI contract, which does not
 * yet expose the atomic `POST /finance/trees/{tree_id}/copy` endpoint, so the
 * tree is duplicated here by creating the tree and replaying its nodes.
 * Once a lifeos-cli release ships that endpoint and the web pin is bumped,
 * replace this module (including the name resolution) with a single call to
 * the server endpoint and delete it.
 */

/**
 * Suffix appended to the source tree name when no explicit copy name is
 * given. Mirrors the canonical naming rule owned by the lifeos-cli finance
 * service (`FINANCE_TREE_COPY_NAME_SUFFIX` in
 * `src/lifeos_cli/db/services/finance.py`) so both surfaces produce the same
 * tree names; keep both aligned.
 */
export const COPY_NAME_SUFFIX = " Copy";

type DuplicateTreeApi = Pick<
  typeof import("@/services/api/finance").financeApi,
  "createTree" | "createNode" | "deleteTree"
>;

/**
 * Resolve a unique name for a duplicated finance tree.
 *
 * Defaults to ``<name> Copy`` and falls back to ``<name> Copy 2``,
 * ``<name> Copy 3``, and so on until the name is not taken.
 */
export function copyTreeName(name: string, existingNames: string[]): string {
  const base = name.trim();
  const taken = new Set(existingNames);
  let candidate = `${base}${COPY_NAME_SUFFIX}`;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}${COPY_NAME_SUFFIX} ${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Build the create payload for one source node, remapping the source parent
 * id to the already-created copy's id. The source node list must be ordered
 * parents-first (the finance API returns nodes in tree order).
 */
export function nodeCreatePayload(
  node: FinanceTreeNode,
  parentIdBySource: ReadonlyMap<UUID, UUID>,
): FinanceNodeCreate {
  return {
    name: node.name,
    parent_id: node.parent_id ? (parentIdBySource.get(node.parent_id) ?? null) : null,
    currency_code: node.currency_code ?? null,
    display_order: node.display_order,
  };
}

/**
 * Duplicate a finance tree through the Web API by creating a new tree and
 * then replaying every node under its remapped parent. When a node fails,
 * the partially created tree is removed before the error propagates.
 */
export async function duplicateTree(
  api: DuplicateTreeApi,
  source: FinanceTree,
  existingNames: string[],
): Promise<FinanceTree> {
  const created = await api.createTree({
    name: copyTreeName(source.name, existingNames),
    primary_currency: source.primary_currency,
    display_order: source.display_order,
    is_default: false,
  });
  try {
    const parentIdBySource = new Map<UUID, UUID>();
    for (const node of source.nodes ?? []) {
      const createdNode = await api.createNode(
        created.id,
        nodeCreatePayload(node, parentIdBySource),
      );
      parentIdBySource.set(node.id, createdNode.id);
    }
  } catch (error) {
    await api.deleteTree(created.id).catch(() => undefined);
    throw error;
  }
  return created;
}

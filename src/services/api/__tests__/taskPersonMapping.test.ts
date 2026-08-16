import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  t: vi.fn(
    (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  ),
}));

import { ENDPOINTS } from "@/services/api/endpoints";
import { tasksApi } from "@/services/api/tasks";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const task = {
  id: "t1",
  content: "Task",
  person: [{ id: "p1", name: "Alice" }],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("tasksApi person mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps person to people on lists, details, and hierarchies", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (
          url.startsWith(localUrl(ENDPOINTS.TASKS.BY_VISION_HIERARCHY("v1")))
        ) {
          return Promise.resolve(
            json({
              vision_id: "v1",
              root_tasks: [
                {
                  ...task,
                  subtasks: [{ ...task, id: "t2", subtasks: [] }],
                },
              ],
            }),
          );
        }
        if (url.startsWith(localUrl(ENDPOINTS.TASKS.BY_ID("t1")))) {
          return Promise.resolve(json(task));
        }
        if (url.startsWith(localUrl(ENDPOINTS.TASKS.BASE))) {
          return Promise.resolve(
            json({
              items: [task],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        return Promise.resolve(json({}));
      });

    const list = await tasksApi.getAll();
    expect(list.items[0].people).toEqual([{ id: "p1", name: "Alice" }]);

    const detail = await tasksApi.getById("t1");
    expect(detail.people).toEqual([{ id: "p1", name: "Alice" }]);

    const hierarchy = await tasksApi.getVisionHierarchy("v1");
    expect(hierarchy.root_tasks[0].people).toEqual([
      { id: "p1", name: "Alice" },
    ]);
    expect(hierarchy.root_tasks[0].subtasks[0].people).toEqual([
      { id: "p1", name: "Alice" },
    ]);

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      localUrl(ENDPOINTS.TASKS.BASE),
    );
  });
});

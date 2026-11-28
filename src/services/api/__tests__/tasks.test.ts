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

describe("tasksApi.updateStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the dedicated PATCH status endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "task-1", status: "done" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await tasksApi.updateStatus("task-1", "done");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(localUrl(ENDPOINTS.TASKS.STATUS("task-1")));
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ status: "done" }));
  });

  it("includes apply_to_subtasks when cascade is requested", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "task-1", status: "done" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await tasksApi.updateStatus("task-1", "done", { applyToSubtasks: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(
      JSON.stringify({ status: "done", apply_to_subtasks: true }),
    );
  });
});

describe("tasksApi.getTimelogs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("queries timelogs through the task_id filter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "timelog-1", title: "Focus" }],
          pagination: { page: 2, size: 10, total: 1, pages: 1 },
          meta: { task_id: "task-1" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await tasksApi.getTimelogs("task-1", 2, 10);

    expect(response.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      localUrl(`${ENDPOINTS.TIMELOGS.BASE}?task_id=task-1&page=2&size=10`),
    );
    expect(init.method).toBe("GET");
  });
});

describe("tasksApi.getByIdsQuiet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("batch-fetches tasks through the id_in filter in one silent request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "parent-a" }, { id: "parent-b" }],
          pagination: { page: 1, size: 2, total: 2, pages: 1 },
          meta: { id_in: "parent-a,parent-b" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const items = await tasksApi.getByIdsQuiet([
      "parent-a" as never,
      "parent-b" as never,
    ]);

    expect(items).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      localUrl(
        `${ENDPOINTS.TASKS.BASE}?id_in=parent-a%2Cparent-b&size=2&fields=full`,
      ),
    );
    expect(init.method).toBe("GET");
  });

  it("returns an empty list without issuing a request for empty input", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(tasksApi.getByIdsQuiet([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("tasksApi person payloads", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockTaskResponse = () =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "task-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

  it("forwards person_ids when creating a task", async () => {
    const fetchMock = mockTaskResponse();

    await tasksApi.create({
      content: "Plan the week",
      vision_id: "vision-1",
      person_ids: ["person-1", "person-2"],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      content: "Plan the week",
      vision_id: "vision-1",
      person_ids: ["person-1", "person-2"],
    });
  });

  it("forwards person_ids when updating a task", async () => {
    const fetchMock = mockTaskResponse();

    await tasksApi.update("task-1", {
      content: "Plan the week",
      person_ids: ["person-1"],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toMatchObject({
      content: "Plan the week",
      person_ids: ["person-1"],
    });
  });

  it("keeps an explicit empty list so person links can be cleared", async () => {
    const fetchMock = mockTaskResponse();

    await tasksApi.update("task-1", { person_ids: [] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ person_ids: [] });
  });

  it("leaves person_ids out when the caller does not send the field", async () => {
    const fetchMock = mockTaskResponse();

    await tasksApi.update("task-1", { content: "Plan the week" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ content: "Plan the week" });
  });
});

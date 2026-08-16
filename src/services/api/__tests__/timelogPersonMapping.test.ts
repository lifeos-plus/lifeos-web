import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { timelogsApi } from "@/services/api/timelogs";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const timelog = {
  id: "tl1",
  title: "Focus",
  person: [{ id: "p1", name: "Alice" }],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("timelogsApi person mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps person to people on create, update, and quickEnd", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(json(timelog)),
    );

    const created = await timelogsApi.create({ title: "Focus" } as never);
    expect(created.people).toEqual([{ id: "p1", name: "Alice" }]);

    const updated = await timelogsApi.update("tl1", { title: "Focus 2" } as never);
    expect(updated.people).toEqual([{ id: "p1", name: "Alice" }]);

    const ended = await timelogsApi.quickEnd("tl1");
    expect(ended.people).toEqual([{ id: "p1", name: "Alice" }]);
  });

  it("sends the person batch update payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ updated_count: 1, failed_ids: [], errors: [] }));

    await timelogsApi.batchUpdate({
      timelog_ids: ["tl1"],
      update_type: "person",
      person: { mode: "add", person_ids: ["p1"] },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(localUrl(ENDPOINTS.TIMELOGS.BATCH_UPDATE));
    expect(JSON.parse(String(init.body))).toEqual({
      timelog_ids: ["tl1"],
      update_type: "person",
      person: { mode: "add", person_ids: ["p1"] },
    });
  });
});

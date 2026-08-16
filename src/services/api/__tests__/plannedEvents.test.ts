import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { plannedEventsApi } from "@/services/api/plannedEvents";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const event = {
  id: "e1",
  title: "Call Alice",
  person: [{ id: "p1", name: "Alice" }],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("plannedEventsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps person to people on list and detail responses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url.startsWith(localUrl(ENDPOINTS.PLANNED_EVENTS.BY_ID("e1")))) {
          return Promise.resolve(json(event));
        }
        if (url.startsWith(localUrl(ENDPOINTS.PLANNED_EVENTS.BASE))) {
          return Promise.resolve(
            json({
              items: [event],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        return Promise.resolve(json({}));
      });

    const list = await plannedEventsApi.fetchRange("2026-01-01", "2026-01-02");
    expect(list.items[0].person).toEqual([{ id: "p1", name: "Alice" }]);

    const detail = await plannedEventsApi.getById("e1");
    expect(detail.person).toEqual([{ id: "p1", name: "Alice" }]);

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      localUrl(ENDPOINTS.PLANNED_EVENTS.BASE),
    );
  });

  it("sends create and update through the planned event endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(json(event)));

    await plannedEventsApi.create({ title: "Call" } as never);
    await plannedEventsApi.update("e1", { title: "Call Updated" } as never);

    const calls = fetchMock.mock.calls.map((call) => ({
      url: String(call[0]),
      method: (call[1] as RequestInit | undefined)?.method ?? "GET",
    }));
    expect(calls[0].url).toBe(localUrl(ENDPOINTS.PLANNED_EVENTS.BASE));
    expect(calls[0].method).toBe("POST");
    expect(calls[1].url).toBe(localUrl(ENDPOINTS.PLANNED_EVENTS.BY_ID("e1")));
    expect(calls[1].method).toBe("PATCH");
  });
});

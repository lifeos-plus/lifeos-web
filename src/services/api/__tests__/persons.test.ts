import { beforeEach, describe, expect, it, vi } from "vitest";

import { ENDPOINTS } from "@/services/api/endpoints";
import { personsApi } from "@/services/api/persons";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const person = {
  id: "p1",
  name: "Alice",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("personsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the singular person endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url.startsWith(localUrl(ENDPOINTS.PERSONS.ACTIVITIES("p1")))) {
          return Promise.resolve(
            json({
              items: [],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        if (url.startsWith(localUrl(ENDPOINTS.PERSONS.ANNIVERSARIES("p1")))) {
          return Promise.resolve(
            json({
              items: [],
              pagination: { page: 1, size: 10, total: 0, pages: 0 },
              meta: { person_id: "p1" },
            }),
          );
        }
        if (url.startsWith(localUrl(ENDPOINTS.PERSONS.SEARCH_BY_TAG))) {
          return Promise.resolve(
            json({
              items: [person],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        if (url.startsWith(localUrl(ENDPOINTS.PERSONS.BY_ID("p1")))) {
          return Promise.resolve(json(person));
        }
        if (url.startsWith(localUrl(ENDPOINTS.PERSONS.BASE))) {
          return Promise.resolve(
            json({
              items: [person],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        return Promise.resolve(json({}));
      });

    const list = await personsApi.getAll();
    expect(list.items[0].id).toBe("p1");

    const detail = await personsApi.getById("p1");
    expect(detail.id).toBe("p1");

    await personsApi.create({ name: "Bob" });
    await personsApi.update("p1", { name: "Alice Updated" });
    await personsApi.delete("p1");
    const activities = await personsApi.getActivities("p1");
    expect(activities.items).toEqual([]);
    const anniversaries = await personsApi.getAnniversaries("p1");
    expect(anniversaries.items).toEqual([]);
    const byTag = await personsApi.searchByTag("work");
    expect(byTag.items[0].id).toBe("p1");

    const calls = fetchMock.mock.calls.map((call) => ({
      url: String(call[0]),
      method: (call[1] as RequestInit | undefined)?.method ?? "GET",
    }));
    const urls = calls.map((c) => c.url);
    expect(urls.some((url) => url.startsWith(localUrl(ENDPOINTS.PERSONS.BASE)))).toBe(
      true,
    );
    expect(
      urls.some((url) => url.startsWith(localUrl(ENDPOINTS.PERSONS.BY_ID("p1")))),
    ).toBe(true);
    expect(
      urls.some((url) =>
        url.startsWith(localUrl(ENDPOINTS.PERSONS.ACTIVITIES("p1"))),
      ),
    ).toBe(true);
    expect(
      urls.some((url) =>
        url.startsWith(localUrl(ENDPOINTS.PERSONS.ANNIVERSARIES("p1"))),
      ),
    ).toBe(true);
    expect(
      urls.some((url) =>
        url.startsWith(localUrl(ENDPOINTS.PERSONS.SEARCH_BY_TAG)),
      ),
    ).toBe(true);
    expect(calls.map((c) => c.method)).toContain("POST");
    expect(calls.map((c) => c.method)).toContain("PATCH");
    expect(calls.map((c) => c.method)).toContain("DELETE");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  t: vi.fn(
    (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  ),
}));

import { ENDPOINTS } from "@/services/api/endpoints";
import { visionsApi } from "@/services/api/visions";

const localUrl = (path: string) => new URL(path, "http://localhost").toString();

const vision = {
  id: "v1",
  name: "Focus",
  status: "active",
  stage: 1,
  experience_points: 0,
  experience_rate_per_hour: null,
  created_at: "2026-01-01T00:00:00Z",
  person: [{ id: "p1", name: "Alice" }],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("visionsApi person mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps person to people on list and detail responses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url.startsWith(localUrl(ENDPOINTS.VISIONS.BY_ID("v1")))) {
          return Promise.resolve(json(vision));
        }
        if (url.startsWith(localUrl(ENDPOINTS.VISIONS.BASE))) {
          return Promise.resolve(
            json({
              items: [vision],
              pagination: { page: 1, size: 10, total: 1, pages: 1 },
              meta: {},
            }),
          );
        }
        return Promise.resolve(json({}));
      });

    const list = await visionsApi.getAll();
    expect(list.items[0].people).toEqual([{ id: "p1", name: "Alice" }]);

    const detail = await visionsApi.getById("v1");
    expect(detail.people).toEqual([{ id: "p1", name: "Alice" }]);

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      localUrl(ENDPOINTS.VISIONS.BASE),
    );
  });
});

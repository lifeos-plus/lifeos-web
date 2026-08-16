import { describe, expect, it } from "vitest";

import { DataCleaner } from "@/utils/protocol";

describe("DataCleaner", () => {
  it("create: trims strings, nullifies empty values, and drops undefined", () => {
    const result = DataCleaner.create({
      name: "  hello  ",
      empty: "",
      tags: ["a", "  ", ""],
      nums: [1, null, 2],
      gone: undefined,
      explicit: null,
    });

    expect(result).toEqual({
      name: "hello",
      empty: null,
      tags: ["a"],
      nums: [1, 2],
      explicit: null,
    });
  });

  it("update: behaves like create for partial updates", () => {
    const result = DataCleaner.update({
      description: "  text  ",
      emptyArray: [],
      untouched: undefined,
    });

    expect(result).toEqual({
      description: "text",
      emptyArray: null,
    });
  });

  it("updateWithUndefined: keeps undefined fields so callers can detect them", () => {
    const result = DataCleaner.updateWithUndefined({
      present: "x",
      missing: undefined,
    });

    expect(Object.keys(result)).toEqual(["present", "missing"]);
    expect(result).toHaveProperty("present", "x");
    expect(result).toHaveProperty("missing", undefined);
  });

  it("query: preserves empty strings, empty arrays, and undefined", () => {
    const result = DataCleaner.query({
      name: "  padded  ",
      empty: "",
      tags: [],
      missing: undefined,
      explicitNull: null,
    });

    expect(result).toEqual({
      name: "padded",
      empty: "",
      tags: [],
      missing: undefined,
      explicitNull: null,
    });
  });

  it("filters blank strings out of arrays without trimming the survivors", () => {
    const result = DataCleaner.create({
      items: ["  keep  ", "   ", "", "again"],
    });

    expect(result).toEqual({ items: ["  keep  ", "again"] });
  });
});

import { describe, expect, it } from "vitest";

import { ApiError } from "@/services/api/client";
import {
  retryDelayForRequest,
  shouldRetryRequest,
} from "@/utils/query";

describe("shouldRetryRequest", () => {
  it("retries 429 responses a bounded number of times", () => {
    const rateLimited = new ApiError("Rate limit exceeded", 429);
    expect(shouldRetryRequest(0, rateLimited)).toBe(true);
    expect(shouldRetryRequest(1, rateLimited)).toBe(true);
    expect(shouldRetryRequest(2, rateLimited)).toBe(false);
  });

  it("never retries other 4xx responses", () => {
    expect(shouldRetryRequest(0, new ApiError("Bad request", 400))).toBe(false);
    expect(shouldRetryRequest(3, new ApiError("Not found", 404))).toBe(false);
  });

  it("keeps the default bounded retry for transport and 5xx failures", () => {
    expect(shouldRetryRequest(0, new Error("network down"))).toBe(true);
    expect(shouldRetryRequest(2, new Error("network down"))).toBe(true);
    expect(shouldRetryRequest(3, new Error("network down"))).toBe(false);
    expect(shouldRetryRequest(0, new ApiError("Server error", 500))).toBe(true);
  });
});

describe("retryDelayForRequest", () => {
  it("honors Retry-After on 429 responses", () => {
    const rateLimited = new ApiError("Rate limit exceeded", 429, {
      retryAfter: 5,
    });
    expect(retryDelayForRequest(0, rateLimited)).toBe(5_000);
  });

  it("falls back to exponential backoff for 429 without Retry-After", () => {
    const rateLimited = new ApiError("Rate limit exceeded", 429);
    expect(retryDelayForRequest(0, rateLimited)).toBe(1_000);
    expect(retryDelayForRequest(1, rateLimited)).toBe(2_000);
  });

  it("caps exponential backoff", () => {
    expect(retryDelayForRequest(5, new Error("network down"))).toBe(30_000);
  });
});

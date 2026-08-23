import { ApiError } from "@/services/api/client";

/**
 * Retry policy shared by every TanStack Query in the app.
 *
 * 429 (Too Many Requests) is transient: the server publishes Retry-After and
 * the local LifeOS API rate-limits per client window, so a bounded retry with
 * backoff is safe and recovers the burst window. Other 4xx responses are
 * never retried (they reflect client/contract errors), while transport and
 * 5xx failures keep the default bounded retry.
 */

const MAX_429_RETRIES = 2;
const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30_000;

export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return failureCount < MAX_429_RETRIES;
    }
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }
  return failureCount < DEFAULT_MAX_RETRIES;
}

export function retryDelayForRequest(
  retryCount: number,
  error: unknown,
): number {
  const exponentialBackoff = Math.min(
    1_000 * 2 ** retryCount,
    MAX_BACKOFF_MS,
  );
  if (error instanceof ApiError && error.status === 429) {
    if (error.retryAfter != null) {
      return Math.min(error.retryAfter * 1_000, MAX_BACKOFF_MS);
    }
    return exponentialBackoff;
  }
  return exponentialBackoff;
}

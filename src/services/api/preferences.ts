import { http } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { components } from "./generated/schema";

export type PreferenceValue = components["schemas"]["JsonValue"];
type PreferenceResponse = components["schemas"]["PreferenceResponse"];
type PreferenceUpdate = components["schemas"]["PreferenceUpdate"];

export const preferencesApi = {
  async getWithMeta<T = PreferenceValue>(
    key: string,
  ): Promise<{
    key: string;
    value: T | null;
    meta?: {
      allowed_values?: unknown[];
      default_value?: T;
      description?: string;
      module?: string;
    };
  }> {
    // The contract always returns `meta`; no query flag is required.
    const response = await http.get<PreferenceResponse>(
      ENDPOINTS.PREFERENCES.BY_KEY(key),
    );
    return {
      ...response,
      value: response.value as T | null,
      meta: {
        ...response.meta,
        allowed_values: response.meta.allowed_values ?? undefined,
        default_value: response.meta.default_value as T,
        description: response.meta.description ?? undefined,
      },
    };
  },

  async set<T = PreferenceValue>(
    key: string,
    value: T,
    module: string = "general",
  ) {
    const payload: PreferenceUpdate = {
      value,
      module,
    };
    return http.put<PreferenceResponse>(ENDPOINTS.PREFERENCES.BY_KEY(key), payload);
  },
};

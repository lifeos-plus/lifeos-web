import { http } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { components } from "./generated/schema";

export type PreferenceValue = components["schemas"]["JsonValue"];
export type PreferenceMeta = components["schemas"]["PreferenceMetaResponse"];
type PreferenceResponse = components["schemas"]["PreferenceResponse"];
type PreferenceUpdate = components["schemas"]["PreferenceUpdate"];

export const preferencesApi = {
  async getWithMeta<T = PreferenceValue>(
    key: string,
  ): Promise<{
    key: string;
    value: T | null;
    meta?: PreferenceMeta;
  }> {
    // The contract always returns `meta`; no query flag is required.
    const response = await http.get<PreferenceResponse>(
      ENDPOINTS.PREFERENCES.BY_KEY(key),
    );
    return {
      key: response.key,
      value: response.value as T | null,
      meta: response.meta,
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

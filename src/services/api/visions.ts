import { http } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { components } from "./generated/schema";
import type { PersonSummary } from "./types/common";
import type { UUID } from "@/types/primitive";

export type Vision = Omit<components["schemas"]["VisionResponse"], "person"> & {
  people?: PersonSummary[];
};
export type VisionCreate = components["schemas"]["VisionCreate"];
export type VisionUpdate = components["schemas"]["VisionUpdate"];
export type VisionWithTasks = components["schemas"]["VisionWithTasksResponse"];
export type VisionStatsResponse = components["schemas"]["VisionStatsResponse"];

export interface VisionExperienceRateUpdatePayload {
  id: UUID;
  experience_rate_per_hour: number | null;
}

type VisionListTransport = components["schemas"]["ListResponse_VisionResponse_VisionListMeta_"];
export type VisionListResponse = Omit<VisionListTransport, "items"> & {
  items: Vision[];
};

const toVision = (vision: components["schemas"]["VisionResponse"]): Vision => ({
  ...vision,
  people: vision.person,
});

export const visionsApi = {
  async getAll(
    statusFilter?: string,
    page: number = 1,
    size: number = 100,
  ): Promise<VisionListResponse> {
    const response = await http.get<VisionListTransport>(ENDPOINTS.VISIONS.BASE, {
      status_filter: statusFilter,
      page,
      size,
    });
    return { ...response, items: response.items.map(toVision) };
  },

  async getById(id: UUID): Promise<Vision> {
    return http
      .get<components["schemas"]["VisionResponse"]>(ENDPOINTS.VISIONS.BY_ID(id))
      .then(toVision);
  },

  async getWithTasks(id: UUID): Promise<Vision> {
    return http
      .get<components["schemas"]["VisionResponse"]>(ENDPOINTS.VISIONS.WITH_TASKS(id))
      .then(toVision);
  },

  async create(vision: VisionCreate): Promise<VisionWithTasks> {
    return http.post<VisionWithTasks>(ENDPOINTS.VISIONS.BASE, vision);
  },

  async update(id: UUID, vision: VisionUpdate): Promise<Vision> {
    return http
      .patch<components["schemas"]["VisionResponse"]>(
        ENDPOINTS.VISIONS.BY_ID(id),
        vision,
      )
      .then(toVision);
  },

  async delete(id: UUID): Promise<void> {
    return http.delete<void>(ENDPOINTS.VISIONS.BY_ID(id));
  },

  async addExperience(id: UUID, experiencePoints: number): Promise<Vision> {
    return http
      .post<components["schemas"]["VisionResponse"]>(
        ENDPOINTS.VISIONS.ADD_EXPERIENCE(id),
        {
          experience_points: experiencePoints,
        },
      )
      .then(toVision);
  },

  async harvest(id: UUID): Promise<Vision> {
    return http
      .post<components["schemas"]["VisionResponse"]>(ENDPOINTS.VISIONS.HARVEST(id))
      .then(toVision);
  },

  async getStats(id: UUID): Promise<VisionStatsResponse> {
    return http.get<VisionStatsResponse>(ENDPOINTS.VISIONS.STATS(id));
  },

  async recomputeEfforts(
    id: UUID,
  ): Promise<components["schemas"]["VisionRecomputeResponse"]> {
    return http.post<components["schemas"]["VisionRecomputeResponse"]>(
      ENDPOINTS.VISIONS.RECOMPUTE_EFFORTS(id),
    );
  },

  async syncExperience(id: UUID): Promise<Vision> {
    return http
      .post<components["schemas"]["VisionResponse"]>(
        ENDPOINTS.VISIONS.SYNC_EXPERIENCE(id),
      )
      .then(toVision);
  },

  async bulkUpdateExperienceRates(
    items: VisionExperienceRateUpdatePayload[],
  ): Promise<Vision[]> {
    const updated = await Promise.all(
      items.map((item) =>
        visionsApi.update(item.id, {
          experience_rate_per_hour: item.experience_rate_per_hour,
        }),
      ),
    );
    return updated;
  },
};

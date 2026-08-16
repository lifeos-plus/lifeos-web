import type { UUID } from "@/types/primitive";
import { http } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { components } from "./generated/schema";
import type { PersonSummary } from "./types/common";

export type TimelogTemplate = Omit<
  components["schemas"]["TimelogTemplateResponse"],
  "person"
> & {
  people?: PersonSummary[];
};
type TimelogTemplatesListTransport = components["schemas"]["ListResponse_TimelogTemplateResponse_TimelogTemplateListMeta_"];
export type TimelogTemplatesListResponse = Omit<
  TimelogTemplatesListTransport,
  "items"
> & {
  items: TimelogTemplate[];
};
export type TimelogTemplateCreateRequest = components["schemas"]["TimelogTemplateCreate"];
export type TimelogTemplateUpdateRequest = components["schemas"]["TimelogTemplateUpdate"];
export type TimelogTemplateReorderItem = components["schemas"]["TimelogTemplateReorderItem"];

const toTimelogTemplate = (
  template: components["schemas"]["TimelogTemplateResponse"],
): TimelogTemplate => ({
  ...template,
  people: template.person,
});

export const timelogTemplatesApi = {
  list: async (params?: {
    page?: number;
    size?: number;
    order_by?: "position" | "usage" | "recent";
  }): Promise<TimelogTemplatesListResponse> => {
    const response = await http.get<TimelogTemplatesListTransport>(
      ENDPOINTS.TIMELOGS.TEMPLATES.BASE,
      {
        page: params?.page,
        size: params?.size,
        order_by: params?.order_by,
      },
    );
    return { ...response, items: response.items.map(toTimelogTemplate) };
  },
  create: (payload: TimelogTemplateCreateRequest): Promise<TimelogTemplate> =>
    http
      .post<components["schemas"]["TimelogTemplateResponse"]>(
        ENDPOINTS.TIMELOGS.TEMPLATES.BASE,
        payload,
      )
      .then(toTimelogTemplate),
  bulkCreate: (
    items: TimelogTemplateCreateRequest[],
  ): Promise<TimelogTemplatesListResponse> =>
    http
      .post<TimelogTemplatesListTransport>(ENDPOINTS.TIMELOGS.TEMPLATES.BULK, {
        items,
      })
      .then((response) => ({
        ...response,
        items: response.items.map(toTimelogTemplate),
      })),
  update: (
    id: UUID,
    payload: TimelogTemplateUpdateRequest,
  ): Promise<TimelogTemplate> =>
    http
      .patch<components["schemas"]["TimelogTemplateResponse"]>(
        ENDPOINTS.TIMELOGS.TEMPLATES.BY_ID(id),
        payload,
      )
      .then(toTimelogTemplate),
  remove: (id: UUID): Promise<void> =>
    http.delete<void>(ENDPOINTS.TIMELOGS.TEMPLATES.BY_ID(id)),
  reorder: (items: TimelogTemplateReorderItem[]): Promise<void> =>
    http.patch<void>(ENDPOINTS.TIMELOGS.TEMPLATES.REORDER, { items }),
  bumpUsage: (id: UUID): Promise<TimelogTemplate> =>
    http
      .post<components["schemas"]["TimelogTemplateResponse"]>(
        ENDPOINTS.TIMELOGS.TEMPLATES.BUMP_USAGE(id),
      )
      .then(toTimelogTemplate),
};

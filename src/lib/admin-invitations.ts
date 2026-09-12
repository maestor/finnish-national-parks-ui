import { apiAuthFetch } from "./api";
import type { paths } from "./api-types";

export type AdminInvitationResponse =
  paths["/api/admin/invitations"]["post"]["responses"][201]["content"]["application/json"];

type CreateAdminInvitationRequest = NonNullable<
  paths["/api/admin/invitations"]["post"]["requestBody"]
>["content"]["application/json"];

export const createAdminInvitation = async (
  request: CreateAdminInvitationRequest,
): Promise<AdminInvitationResponse> =>
  apiAuthFetch<AdminInvitationResponse>("/api/admin/invitations", {
    body: JSON.stringify(request),
    method: "POST",
  });

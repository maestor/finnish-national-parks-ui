import { apiAuthFetch } from "./api";
import type { paths } from "./api-types";

export type AdminUser =
  paths["/api/admin/admins"]["get"]["responses"][200]["content"]["application/json"]["admins"][number];

type UpdateAdminUserRequest = NonNullable<
  paths["/api/admin/admins/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

type AdminUserListResponse =
  paths["/api/admin/admins"]["get"]["responses"][200]["content"]["application/json"];

export const listAdminUsers = async (): Promise<AdminUserListResponse> =>
  apiAuthFetch<AdminUserListResponse>("/api/admin/admins");

export const updateAdminUser = async (
  id: number,
  request: UpdateAdminUserRequest,
): Promise<AdminUser> =>
  apiAuthFetch<AdminUser>(`/api/admin/admins/${id}`, {
    body: JSON.stringify(request),
    method: "PATCH",
  });

export const removeAdminUser = async (id: number): Promise<void> => {
  await apiAuthFetch<void>(`/api/admin/admins/${id}`, { method: "DELETE" });
};

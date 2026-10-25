import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminUsersResponse } from "@/lib/types";

/** The signed-up users and their counts: the admin's view only (the API answers 403 to anyone else). */
export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUsersResponse>("/api/v1/admin/users"),
    enabled,
  });
}

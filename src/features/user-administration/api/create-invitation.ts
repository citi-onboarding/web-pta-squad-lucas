import type { ApiClient } from "@/shared/lib/api/create-client";

import { invitationSchema } from "../types/user";

export function createInvitation(client: ApiClient, userId: string) {
  return client.request(`api/v1/users/${userId}/invitations`, {
    method: "POST",
    schema: invitationSchema,
  });
}

import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";

export function acceptInvitation(
  client: ApiClient,
  input: { token: string; password: string },
) {
  return client.request("api/v1/invitations/accept", {
    method: "POST",
    body: input,
    schema: z.undefined(),
  });
}

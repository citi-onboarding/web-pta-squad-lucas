import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";

const invitationLookupSchema = z.object({
  name: z.string(),
  email: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
});

export function lookupInvitation(client: ApiClient, token: string) {
  return client.request("api/v1/invitations/lookup", {
    method: "POST",
    body: { token },
    schema: invitationLookupSchema,
  });
}

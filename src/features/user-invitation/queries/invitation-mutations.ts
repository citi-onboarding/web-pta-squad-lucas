import { mutationOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { acceptInvitation } from "../api/accept-invitation";
import { lookupInvitation } from "../api/lookup-invitation";

// Lookup and acceptance are mutations with no cache lifetime, so the token and
// the password never sit under a query key or in the cache.
export function lookupInvitationMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: (token: string) => lookupInvitation(client, token),
    networkMode: "always",
    gcTime: 0,
  });
}

export function acceptInvitationMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: (input: { token: string; password: string }) =>
      acceptInvitation(client, input),
    networkMode: "always",
    gcTime: 0,
  });
}

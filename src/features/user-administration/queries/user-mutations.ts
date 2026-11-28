import { mutationOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { createInvitation } from "../api/create-invitation";
import { registerUser } from "../api/register-user";
import type { Registration } from "../api/register-user";

// The token is in the result, so the mutation leaves the mutation cache as soon as its dialog unmounts.
export function registerUserMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: (registration: Registration) =>
      registerUser(client, registration),
    networkMode: "always",
    gcTime: 0,
  });
}

export function createInvitationMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: (userId: string) => createInvitation(client, userId),
    networkMode: "always",
    gcTime: 0,
  });
}

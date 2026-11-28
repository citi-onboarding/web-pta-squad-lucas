import { mutationOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { signOut } from "../api/sign-out";

export function signOutMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: () => signOut(client),
    networkMode: "always",
  });
}

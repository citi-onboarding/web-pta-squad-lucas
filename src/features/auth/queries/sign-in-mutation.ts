import { mutationOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { signIn } from "../api/sign-in";
import type { Credentials } from "../api/sign-in";

export function signInMutationOptions(client: ApiClient) {
  return mutationOptions({
    mutationFn: (credentials: Credentials) => signIn(client, credentials),
    networkMode: "always",
  });
}

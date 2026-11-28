import { useMutation, useQueryClient } from "@tanstack/react-query";

import { identityQueryOptions } from "@/features/auth/queries/identity-query";

import { getApiClient } from "./api-client";
import { useSignOut } from "./use-sign-out";

// Checks the identity first and signs out only when a session exists.
export function useEndOpenSession() {
  const queryClient = useQueryClient();
  const { mutateAsync: signOut } = useSignOut();

  return useMutation({
    mutationFn: async () => {
      const user = await queryClient.fetchQuery({
        ...identityQueryOptions(getApiClient()),
        staleTime: 0,
      });

      if (user) {
        await signOut();
      }
    },
    networkMode: "always",
  });
}

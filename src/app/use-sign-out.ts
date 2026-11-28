import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { identityQueryOptions } from "@/features/auth/queries/identity-query";
import { signOutMutationOptions } from "@/features/auth/queries/sign-out-mutation";

import { getApiClient } from "./api-client";

export function useSignOut() {
  const queryClient = useQueryClient();
  const apiClient = getApiClient();

  return useMutation({
    ...signOutMutationOptions(apiClient),
    onSuccess: async () => {
      const { queryKey } = identityQueryOptions(apiClient);
      const identityHash = hashKey(queryKey);

      // Cancel first so that no late answer can bring user data back.
      await queryClient.cancelQueries();
      queryClient.setQueryData(queryKey, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryHash !== identityHash,
      });
      // Past mutations keep their variables, including the sign-in password.
      queryClient.getMutationCache().clear();
    },
  });
}

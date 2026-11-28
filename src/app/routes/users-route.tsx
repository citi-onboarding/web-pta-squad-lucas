import { useQueryClient } from "@tanstack/react-query";

import { identityQueryOptions } from "@/features/auth/queries/identity-query";
import { UsersPage } from "@/features/user-administration/components/users-page";

import { getApiClient } from "../api-client";

export function UsersRoute() {
  const queryClient = useQueryClient();
  const apiClient = getApiClient();

  return (
    <UsersPage
      apiClient={apiClient}
      // The page guard redirects when the new check finds no session.
      onUnauthorized={() =>
        void queryClient.refetchQueries({
          queryKey: identityQueryOptions(apiClient).queryKey,
        })
      }
    />
  );
}

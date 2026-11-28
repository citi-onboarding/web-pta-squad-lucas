import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import { SignInScreen } from "@/features/auth/components/sign-in-screen";
import { identityQueryOptions } from "@/features/auth/queries/identity-query";

import { getApiClient } from "../api-client";
import { destinationFor } from "../role-access";
import { useIdentity } from "../use-identity";

export function SignInRoute() {
  const queryClient = useQueryClient();
  const { data: user } = useIdentity();
  const apiClient = getApiClient();

  if (user) {
    return <Navigate replace to={destinationFor(user.role)} />;
  }

  return (
    <SignInScreen
      apiClient={apiClient}
      onSignedIn={async (signedIn) => {
        const { queryKey } = identityQueryOptions(apiClient);

        // A pending anonymous answer must not overwrite the signed-in user.
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, signedIn);
      }}
    />
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { SignInScreen } from "@/features/auth/components/sign-in-screen";
import { identityQueryOptions } from "@/features/auth/queries/identity-query";

import { getApiClient } from "../api-client";
import { destinationFor } from "../role-access";
import { useIdentity } from "../use-identity";

export function SignInRoute() {
  const queryClient = useQueryClient();
  const { data: user } = useIdentity();
  const apiClient = getApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  // Read once: history keeps `state` across a reload, so it is cleared below.
  const [createdEmail] = useState(() => {
    const state = location.state as { createdEmail?: unknown } | null;

    return typeof state?.createdEmail === "string" ? state.createdEmail : null;
  });

  useEffect(() => {
    if (createdEmail !== null) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // Runs once, right after the first render that read the state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) {
    return <Navigate replace to={destinationFor(user.role)} />;
  }

  return (
    <SignInScreen
      apiClient={apiClient}
      createdEmail={createdEmail}
      onSignedIn={async (signedIn) => {
        const { queryKey } = identityQueryOptions(apiClient);

        // A pending anonymous answer must not overwrite the signed-in user.
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, signedIn);
      }}
    />
  );
}

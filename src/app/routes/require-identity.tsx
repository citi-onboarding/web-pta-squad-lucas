import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { identityQueryOptions } from "@/features/auth/queries/identity-query";
import type { User } from "@/features/auth/types/user";

import { getApiClient } from "../api-client";
import { IdentityFailure } from "./identity-failure";

type RequireIdentityProps = {
  children: (user: User) => ReactNode;
};

export function RequireIdentity({ children }: RequireIdentityProps) {
  // Entering a page asks the server again instead of trusting cached identity.
  const {
    data: user,
    error,
    isFetchedAfterMount,
    isSuccess,
    refetch,
  } = useQuery({
    ...identityQueryOptions(getApiClient()),
    refetchOnMount: "always",
  });

  if (!isFetchedAfterMount) {
    return null;
  }

  if (error) {
    return <IdentityFailure error={error} onRetry={() => void refetch()} />;
  }

  if (!isSuccess) {
    return null;
  }

  return user ? children(user) : <Navigate replace to="/entrar" />;
}

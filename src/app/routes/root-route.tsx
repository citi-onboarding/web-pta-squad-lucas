import { Navigate } from "react-router-dom";

import { destinationFor } from "../role-access";
import { useIdentity } from "../use-identity";
import { IdentityFailure } from "./identity-failure";

export function RootRoute() {
  const { data: user, error, isSuccess, refetch } = useIdentity();

  if (error) {
    return <IdentityFailure error={error} onRetry={() => void refetch()} />;
  }

  if (!isSuccess) {
    return null;
  }

  return <Navigate replace to={user ? destinationFor(user.role) : "/entrar"} />;
}

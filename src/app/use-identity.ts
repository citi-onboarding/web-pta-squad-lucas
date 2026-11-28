import { useQuery } from "@tanstack/react-query";

import { identityQueryOptions } from "@/features/auth/queries/identity-query";

import { getApiClient } from "./api-client";

export function useIdentity() {
  return useQuery(identityQueryOptions(getApiClient()));
}

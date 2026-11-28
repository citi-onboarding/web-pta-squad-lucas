import { queryOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { listErpSellerNames } from "../api/list-erp-seller-names";
import { listUsers } from "../api/list-users";

export const usersQueryKey = ["users", "list"] as const;
export const erpSellerNamesQueryKey = ["users", "erp-seller-names"] as const;

export function usersQueryOptions(client: ApiClient) {
  return queryOptions({
    queryKey: usersQueryKey,
    queryFn: ({ signal }) => listUsers(client, signal),
    retry: false,
    networkMode: "always",
  });
}

export function erpSellerNamesQueryOptions(client: ApiClient) {
  return queryOptions({
    queryKey: erpSellerNamesQueryKey,
    queryFn: ({ signal }) => listErpSellerNames(client, signal),
    retry: false,
    networkMode: "always",
    // The list changes when another administrator registers a seller.
    staleTime: 0,
  });
}

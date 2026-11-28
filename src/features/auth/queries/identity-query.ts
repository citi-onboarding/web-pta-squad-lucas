import { queryOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { getIdentity } from "../api/get-identity";

export function identityQueryOptions(client: ApiClient) {
  return queryOptions({
    queryKey: ["auth", "me"],
    queryFn: () => getIdentity(client),
    retry: false,
    // Attempt the request even when offline, so the failure can be shown.
    networkMode: "always",
  });
}

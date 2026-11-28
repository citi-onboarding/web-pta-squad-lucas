import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";

export function listErpSellerNames(client: ApiClient, signal?: AbortSignal) {
  return client.request("api/v1/users/erp-seller-names", {
    schema: z.array(z.string()),
    signal,
  });
}

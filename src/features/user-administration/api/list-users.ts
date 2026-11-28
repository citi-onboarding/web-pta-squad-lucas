import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { adminUserSchema } from "../types/user";

export function listUsers(client: ApiClient, signal?: AbortSignal) {
  return client.request("api/v1/users", {
    schema: z.array(adminUserSchema),
    signal,
  });
}

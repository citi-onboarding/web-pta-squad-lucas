import type { ApiClient } from "@/shared/lib/api/create-client";
import { ApiError } from "@/shared/lib/api/errors";

import { userSchema } from "../types/user";

export async function getIdentity(client: ApiClient) {
  try {
    return await client.request("api/v1/auth/me", { schema: userSchema });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

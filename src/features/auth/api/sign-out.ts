import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { ApiError } from "@/shared/lib/api/errors";

export async function signOut(client: ApiClient) {
  try {
    await client.request("api/v1/auth/logout", {
      method: "POST",
      schema: z.undefined(),
    });
  } catch (error) {
    // An unauthorized answer means the session has already ended.
    if (!(error instanceof ApiError && error.status === 401)) {
      throw error;
    }
  }
}

import { createBrowserApiClient } from "@/shared/lib/api/client";
import type { ApiClient } from "@/shared/lib/api/create-client";

let apiClient: ApiClient | undefined;

// Created on first use because the client captures `fetch` when it is built.
export function getApiClient() {
  apiClient ??= createBrowserApiClient({ credentials: "include" });

  return apiClient;
}

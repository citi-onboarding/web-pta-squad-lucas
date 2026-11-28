import { useEffect } from "react";

import { ApiError } from "@/shared/lib/api/errors";

// Lets the application check the session again when a request is unauthorized.
export function useReportUnauthorized(
  error: Error | null,
  onUnauthorized: () => void,
) {
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorized();
    }
    // Reported once per failure, whatever the identity of the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
}

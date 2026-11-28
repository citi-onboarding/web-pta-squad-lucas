import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { ApiError } from "@/shared/lib/api/errors";

import { registrationResultSchema } from "../types/user";
import type { Role } from "../types/user";

export type Registration = {
  name: string;
  email: string;
  role: Role;
  erpSellerName?: string;
};

const conflictBodySchema = z.object({
  conflictField: z.enum(["email", "erpSellerName"]),
});

export class RegistrationConflictError extends Error {
  readonly field: "email" | "erpSellerName";

  constructor(field: "email" | "erpSellerName") {
    super(`Registration conflict on ${field}.`);
    this.name = "RegistrationConflictError";
    this.field = field;
  }
}

export async function registerUser(
  client: ApiClient,
  registration: Registration,
) {
  try {
    return await client.request("api/v1/users", {
      method: "POST",
      body: registration,
      schema: registrationResultSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const conflict = conflictBodySchema.safeParse(error.body);

      if (conflict.success) {
        throw new RegistrationConflictError(conflict.data.conflictField);
      }
    }

    throw error;
  }
}

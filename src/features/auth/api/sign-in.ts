import { z } from "zod";

import type { ApiClient } from "@/shared/lib/api/create-client";

import { userSchema } from "../types/user";

const signInResponseSchema = z.strictObject({ user: userSchema });

export type Credentials = {
  email: string;
  password: string;
};

export async function signIn(client: ApiClient, credentials: Credentials) {
  const { user } = await client.request("api/v1/auth/login", {
    method: "POST",
    body: { ...credentials, client: "web" },
    schema: signInResponseSchema,
  });

  return user;
}

import { z } from "zod";

export const userSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["SELLER", "MANAGER", "FINANCE", "ADMIN"]),
  erpSellerName: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

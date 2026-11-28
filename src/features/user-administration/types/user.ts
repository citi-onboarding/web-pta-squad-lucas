import { z } from "zod";

const absoluteDate = z.iso.datetime({ offset: true });

export const adminUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["SELLER", "MANAGER", "FINANCE", "ADMIN"]),
  erpSellerName: z.string().nullable(),
  lastLoginAt: absoluteDate.nullable(),
  status: z.enum(["ACTIVE", "INVITED", "INVITATION_EXPIRED"]),
  invitationExpiresAt: absoluteDate.nullable(),
});

export const invitationSchema = z.object({
  token: z.string().min(1),
  expiresAt: absoluteDate,
});

export const registrationResultSchema = z.object({
  user: adminUserSchema,
  invitation: invitationSchema,
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type Role = AdminUser["role"];

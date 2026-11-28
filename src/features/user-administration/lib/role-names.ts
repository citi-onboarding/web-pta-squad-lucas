import type { Role } from "../types/user";

export const roleNames: Record<Role, string> = {
  SELLER: "Vendedor",
  MANAGER: "Gerente",
  FINANCE: "Financeiro",
  ADMIN: "Administrador",
};

import type { User } from "@/features/auth/types/user";

type Page = { path: string; title: string };

// Menu entries in display order. The first one is the role's destination.
export const rolePages: Record<User["role"], readonly [Page, ...Page[]]> = {
  SELLER: [
    { path: "/clientes", title: "Clientes" },
    { path: "/clientes-em-risco", title: "Clientes em risco" },
    { path: "/triagem", title: "Triagem de documentos" },
    { path: "/pedidos", title: "Meus pedidos" },
  ],
  MANAGER: [
    { path: "/painel", title: "Painel do comercial" },
    { path: "/clientes-em-risco", title: "Clientes em risco" },
    { path: "/contratos", title: "Contratos e avisos" },
    { path: "/clientes", title: "Clientes" },
    { path: "/triagem", title: "Triagem de documentos" },
    { path: "/pedidos", title: "Pedidos" },
  ],
  FINANCE: [
    { path: "/financeiro/fila", title: "Fila do financeiro" },
    { path: "/pedidos", title: "Pedidos" },
    { path: "/clientes", title: "Clientes" },
    { path: "/painel", title: "Painel do comercial" },
  ],
  ADMIN: [
    { path: "/usuarios", title: "Usuários" },
    { path: "/carga", title: "Carga do histórico" },
    { path: "/sincronizacao", title: "Sincronização com o ERP" },
  ],
};

export const pagePaths = [
  ...new Set(
    Object.values(rolePages).flatMap((pages) => pages.map(({ path }) => path)),
  ),
];

export function destinationFor(role: User["role"]) {
  return rolePages[role][0].path;
}

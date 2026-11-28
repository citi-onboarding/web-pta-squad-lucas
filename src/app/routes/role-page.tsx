import type { User } from "@/features/auth/types/user";

import { rolePages } from "../role-access";
import { PlaceholderPage } from "./placeholder-page";
import { RoleMenu } from "./role-menu";
import { UsersRoute } from "./users-route";

export function RolePage({ path, role }: { path: string; role: User["role"] }) {
  const page = rolePages[role].find((entry) => entry.path === path);

  return (
    <>
      <RoleMenu role={role} />
      {page?.path === "/usuarios" ? (
        <UsersRoute />
      ) : page ? (
        <PlaceholderPage title={page.title} />
      ) : (
        <main className="mx-auto max-w-2xl px-6 py-10">
          <p>Você não tem acesso a esta página</p>
        </main>
      )}
    </>
  );
}

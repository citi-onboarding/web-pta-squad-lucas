import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { getFailureReason } from "@/shared/lib/get-failure-reason";

import { formatDateTime } from "../lib/format-date-time";
import { roleNames } from "../lib/role-names";
import { useReportUnauthorized } from "../lib/use-report-unauthorized";
import { usersQueryOptions } from "../queries/users-query";
import type { AdminUser } from "../types/user";
import { InvitationLinkDialog } from "./invitation-link-dialog";
import { RegistrationDialog } from "./registration-dialog";
import { RenewInvitationDialog } from "./renew-invitation-dialog";

type Dialog =
  | { kind: "register" }
  | { kind: "renew"; user: AdminUser }
  | { kind: "link"; name: string; token: string; expiresAt: string };

const columns = [
  "Nome",
  "E-mail",
  "Papel",
  "Vendedor no ERP",
  "Último acesso",
] as const;
const rowClassName =
  "flex flex-col gap-1 border-b border-zinc-300 py-3 dark:border-zinc-700 md:grid md:grid-cols-[repeat(5,minmax(0,1fr))_9rem] md:items-center md:gap-3";
const cellClassName = "[overflow-wrap:anywhere]";

function lastAccess(user: AdminUser) {
  if (user.status === "INVITATION_EXPIRED") {
    return "Convite vencido";
  }

  if (user.status === "INVITED") {
    return user.invitationExpiresAt
      ? `Convite pendente até ${formatDateTime(user.invitationExpiresAt)}`
      : "Convite pendente";
  }

  return user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca acessou";
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="text-xs text-zinc-600 md:hidden dark:text-zinc-400"
      >
        {label}
      </span>
      <div className={cellClassName} role="cell">
        {children}
      </div>
    </>
  );
}

type UsersPageProps = {
  apiClient: ApiClient;
  onUnauthorized: () => void;
};

export function UsersPage({ apiClient, onUnauthorized }: UsersPageProps) {
  const users = useQuery(usersQueryOptions(apiClient));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const closeDialog = () => setDialog(null);

  useReportUnauthorized(users.error, onUnauthorized);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <p className="mt-2 text-sm">
        Não há autocadastro. Cada vendedor é ligado ao vendedor do ERP, que
        define a carteira.
      </p>
      <button
        className="bg-foreground text-background mt-4 rounded-md px-4 py-2 font-medium"
        onClick={() => setDialog({ kind: "register" })}
        type="button"
      >
        + Cadastrar usuário
      </button>
      {users.isPending ? <p className="mt-6">Carregando usuários…</p> : null}
      {users.isError ? (
        <div className="mt-6" role="status">
          <p className="font-semibold">
            Não foi possível carregar os usuários.
          </p>
          <p className="mt-2">{getFailureReason(users.error)}</p>
          <button
            className="bg-foreground text-background mt-4 rounded-md px-4 py-2 font-medium"
            onClick={() => void users.refetch()}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
      {!users.isError ? (
        <div
          aria-label="Lista de usuários"
          className="mt-6 text-sm"
          role="table"
        >
          <div role="rowgroup">
            <div
              className="sr-only md:not-sr-only md:grid md:grid-cols-[repeat(5,minmax(0,1fr))_9rem] md:gap-3 md:border-b md:border-zinc-500 md:pb-2 md:font-semibold"
              role="row"
            >
              {columns.map((column) => (
                <div key={column} role="columnheader">
                  {column}
                </div>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            {(users.data ?? []).map((user) => (
              <div className={rowClassName} key={user.id} role="row">
                <Cell label="Nome">{user.name}</Cell>
                <Cell label="E-mail">{user.email}</Cell>
                <Cell label="Papel">{roleNames[user.role]}</Cell>
                <Cell label="Vendedor no ERP">{user.erpSellerName || "—"}</Cell>
                <Cell label="Último acesso">{lastAccess(user)}</Cell>
                {user.status === "ACTIVE" ? null : (
                  <div role="gridcell">
                    <button
                      className="rounded-md border border-zinc-500 px-3 py-1"
                      onClick={() => setDialog({ kind: "renew", user })}
                      type="button"
                    >
                      Gerar novo link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {dialog?.kind === "register" ? (
        <RegistrationDialog
          apiClient={apiClient}
          onUnauthorized={onUnauthorized}
          onCancel={closeDialog}
          onRegistered={(name, invitation) =>
            setDialog({ kind: "link", name, ...invitation })
          }
        />
      ) : null}
      {dialog?.kind === "renew" ? (
        <RenewInvitationDialog
          apiClient={apiClient}
          onUnauthorized={onUnauthorized}
          onCancel={closeDialog}
          onRenewed={(invitation) =>
            setDialog({ kind: "link", name: dialog.user.name, ...invitation })
          }
          user={dialog.user}
        />
      ) : null}
      {dialog?.kind === "link" ? (
        <InvitationLinkDialog
          expiresAt={dialog.expiresAt}
          name={dialog.name}
          onClose={closeDialog}
          token={dialog.token}
        />
      ) : null}
    </main>
  );
}

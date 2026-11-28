import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ComponentProps } from "react";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { getFailureReason } from "@/shared/lib/get-failure-reason";

import { RegistrationConflictError } from "../api/register-user";
import { roleNames } from "../lib/role-names";
import { useReportUnauthorized } from "../lib/use-report-unauthorized";
import { registerUserMutationOptions } from "../queries/user-mutations";
import {
  erpSellerNamesQueryKey,
  erpSellerNamesQueryOptions,
  usersQueryKey,
} from "../queries/users-query";
import type { Invitation, Role } from "../types/user";
import { ModalDialog } from "./modal-dialog";

type RegistrationDialogProps = {
  apiClient: ApiClient;
  onCancel: () => void;
  onRegistered: (name: string, invitation: Invitation) => void;
  onUnauthorized: () => void;
};

const fieldClassName =
  "mt-1 block w-full rounded-md border border-zinc-500 bg-transparent px-3 py-2";
const errorClassName = "mt-1 text-sm text-red-700 dark:text-red-400";

export function RegistrationDialog({
  apiClient,
  onCancel,
  onRegistered,
  onUnauthorized,
}: RegistrationDialogProps) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role | "">("");
  const erpSellerNames = useQuery(erpSellerNamesQueryOptions(apiClient));
  const { mutate, error, isPending } = useMutation(
    registerUserMutationOptions(apiClient),
  );
  const isSeller = role === "SELLER";
  // The ERP seller states matter only while the chosen role is seller.
  const loadingNames = isSeller && erpSellerNames.isPending;
  const namesFailure = isSeller ? erpSellerNames.error : null;
  const noErpSeller =
    isSeller && !namesFailure && erpSellerNames.data?.length === 0;
  const sellerBlocked = loadingNames || Boolean(namesFailure) || noErpSeller;
  const conflict = error instanceof RegistrationConflictError ? error : null;
  const otherFailure = error && !conflict ? error : null;

  useReportUnauthorized(error, onUnauthorized);
  useReportUnauthorized(erpSellerNames.error, onUnauthorized);

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name"));

    mutate(
      {
        name,
        email: String(form.get("email")),
        role: String(form.get("role")) as Role,
        ...(isSeller
          ? { erpSellerName: String(form.get("erpSellerName")) }
          : {}),
      },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: usersQueryKey });

          if (isSeller) {
            void queryClient.invalidateQueries({
              queryKey: erpSellerNamesQueryKey,
            });
          }

          onRegistered(name, result.invitation);
        },
      },
    );
  };

  return (
    <ModalDialog
      dismissible={!isPending}
      onClose={onCancel}
      title="Cadastrar usuário"
    >
      <form onSubmit={handleSubmit}>
        <label className="mt-3 block text-sm font-medium">
          Nome
          <input
            autoComplete="off"
            className={fieldClassName}
            name="name"
            required
            type="text"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          E-mail
          <input
            aria-describedby={
              conflict?.field === "email" ? "email-error" : undefined
            }
            autoComplete="off"
            className={fieldClassName}
            name="email"
            required
            type="email"
          />
        </label>
        {conflict?.field === "email" ? (
          <p className={errorClassName} id="email-error">
            Este e-mail já está cadastrado.
          </p>
        ) : null}
        <label className="mt-3 block text-sm font-medium">
          Papel
          <select
            className={fieldClassName}
            name="role"
            onChange={(event) => setRole(event.target.value as Role | "")}
            required
            value={role}
          >
            <option value="">Selecione</option>
            {(Object.keys(roleNames) as Role[]).map((value) => (
              <option key={value} value={value}>
                {roleNames[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Vendedor no ERP (só para vendedores)
          <select
            aria-describedby={
              conflict?.field === "erpSellerName"
                ? "erp-seller-error"
                : noErpSeller
                  ? "erp-seller-empty"
                  : undefined
            }
            className={fieldClassName}
            disabled={!isSeller || loadingNames || Boolean(namesFailure)}
            name="erpSellerName"
            required={isSeller}
          >
            <option value="">
              {loadingNames ? "Carregando vendedores…" : "Selecione"}
            </option>
            {isSeller
              ? (erpSellerNames.data ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              : null}
          </select>
        </label>
        {namesFailure ? (
          <div className="mt-1 text-sm">
            <div className="text-red-700 dark:text-red-400" role="alert">
              <p>Não foi possível carregar os vendedores do ERP.</p>
              <p>{getFailureReason(namesFailure)}</p>
            </div>
            <button
              className="mt-2 rounded-md border border-zinc-500 px-3 py-1"
              onClick={() => void erpSellerNames.refetch()}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}
        {noErpSeller ? (
          <p className="mt-1 text-sm" id="erp-seller-empty">
            Nenhum vendedor do ERP disponível. Aguarde a próxima sincronização.
          </p>
        ) : null}
        {conflict?.field === "erpSellerName" ? (
          <p className={errorClassName} id="erp-seller-error">
            Este vendedor do ERP já está ligado a outro usuário.
          </p>
        ) : null}
        <p className="mt-3 text-sm">
          A pessoa recebe um link para criar a senha.
        </p>
        {otherFailure ? (
          <div className={errorClassName} role="alert">
            <p>{getFailureReason(otherFailure)}</p>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-md border border-zinc-500 px-4 py-2 disabled:opacity-60"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="bg-foreground text-background rounded-md px-4 py-2 font-medium disabled:opacity-60"
            disabled={isPending || sellerBlocked}
            type="submit"
          >
            {isPending ? "Cadastrando…" : "Cadastrar"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

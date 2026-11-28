import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { ApiError } from "@/shared/lib/api/errors";
import { getFailureReason } from "@/shared/lib/get-failure-reason";

import { validatePassword } from "../lib/validate-password";
import {
  acceptInvitationMutationOptions,
  lookupInvitationMutationOptions,
} from "../queries/invitation-mutations";

type InvitationPageProps = {
  apiClient: ApiClient;
  // Changes on every router navigation, which may bring another link.
  navigationKey: string;
  onPasswordCreated: (email: string) => void;
};

type InvitationContentProps = Omit<InvitationPageProps, "navigationKey"> & {
  token: string;
};

const inputClassName =
  "mt-1 block w-full rounded-md border border-zinc-500 bg-transparent px-3 py-2";
const errorClassName = "mt-1 text-sm text-red-700 dark:text-red-400";

function isUnusable(error: Error | null) {
  return error instanceof ApiError && error.status === 404;
}

function removeFragment() {
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + window.location.search,
  );
}

export function InvitationPage({
  navigationKey,
  ...contentProps
}: InvitationPageProps) {
  // The token lives only in this state; the fragment is removed from the address bar.
  const [link, setLink] = useState(() => ({
    token: window.location.hash.slice(1),
    version: 0,
  }));

  // A fragment received while the page is open is a newly opened link.
  const openNewLink = useCallback(() => {
    const token = window.location.hash.slice(1);

    if (token) {
      removeFragment();
      setLink(({ version }) => ({ token, version: version + 1 }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", openNewLink);

    return () => window.removeEventListener("hashchange", openNewLink);
  }, [openNewLink]);

  const handledNavigationKey = useRef(navigationKey);

  useEffect(() => {
    if (handledNavigationKey.current !== navigationKey) {
      handledNavigationKey.current = navigationKey;
      openNewLink();
    } else if (window.location.hash) {
      // The first link is already in state.
      removeFragment();
    }
  }, [navigationKey, openNewLink]);

  // The key discards the earlier state and typed passwords.
  return (
    <InvitationContent
      key={link.version}
      token={link.token}
      {...contentProps}
    />
  );
}

function InvitationContent({
  apiClient,
  token,
  onPasswordCreated,
}: InvitationContentProps) {
  const [fieldError, setFieldError] = useState<{
    field: "password" | "confirmation";
    message: string;
  } | null>(null);
  const lookup = useMutation(lookupInvitationMutationOptions(apiClient));
  const accept = useMutation(acceptInvitationMutationOptions(apiClient));
  const started = useRef(false);
  const { mutate: check } = lookup;

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      check(token);
    }
  }, [token, check]);

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const problem = validatePassword(
      password,
      String(form.get("confirmation")),
    );

    setFieldError(problem);

    if (problem || !lookup.data) {
      return;
    }

    const { email } = lookup.data;

    accept.mutate(
      { token, password },
      { onSuccess: () => onPasswordCreated(email) },
    );
  };

  let content;

  if (!token || isUnusable(lookup.error) || isUnusable(accept.error)) {
    content = (
      <p>
        Este link de convite não vale mais. Ele pode ter vencido ou já ter sido
        usado. Peça um novo link ao administrador.
      </p>
    );
  } else if (lookup.error) {
    content = (
      <div role="alert">
        <p className="font-semibold">Não foi possível verificar o convite.</p>
        <p className="mt-2">{getFailureReason(lookup.error)}</p>
        <button
          className="bg-foreground text-background mt-4 rounded-md px-4 py-2 font-medium"
          onClick={() => check(token)}
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    );
  } else if (lookup.data) {
    content = (
      <>
        <h1 className="text-2xl font-semibold">Criar senha</h1>
        <p className="mt-2 text-sm [overflow-wrap:anywhere]">
          Olá, {lookup.data.name}. Crie a senha para entrar com{" "}
          {lookup.data.email}.
        </p>
        <form className="mt-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Senha
            <input
              aria-describedby={
                fieldError?.field === "password" ? "password-error" : "hint"
              }
              autoComplete="new-password"
              className={inputClassName}
              name="password"
              required
              type="password"
            />
          </label>
          {fieldError?.field === "password" ? (
            <p className={errorClassName} id="password-error">
              {fieldError.message}
            </p>
          ) : null}
          <p className="mt-1 text-sm" id="hint">
            Use de 8 a 72 caracteres.
          </p>
          <label className="mt-4 block text-sm font-medium">
            Confirmar senha
            <input
              aria-describedby={
                fieldError?.field === "confirmation"
                  ? "confirmation-error"
                  : undefined
              }
              autoComplete="new-password"
              className={inputClassName}
              name="confirmation"
              required
              type="password"
            />
          </label>
          {fieldError?.field === "confirmation" ? (
            <p className={errorClassName} id="confirmation-error">
              {fieldError.message}
            </p>
          ) : null}
          {accept.error ? (
            <div className={errorClassName} role="alert">
              <p>{getFailureReason(accept.error)}</p>
            </div>
          ) : null}
          <button
            className="bg-foreground text-background mt-6 w-full rounded-md px-4 py-2 font-medium disabled:opacity-60"
            disabled={accept.isPending}
            type="submit"
          >
            {accept.isPending ? "Criando…" : "Criar senha"}
          </button>
        </form>
      </>
    );
  } else {
    content = <p>Verificando convite…</p>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">{content}</main>
  );
}

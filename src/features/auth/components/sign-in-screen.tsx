import { useMutation } from "@tanstack/react-query";
import type { ComponentProps } from "react";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { ApiError } from "@/shared/lib/api/errors";

import { getFailureReason } from "@/shared/lib/get-failure-reason";
import { signInMutationOptions } from "../queries/sign-in-mutation";
import type { User } from "../types/user";

type SignInScreenProps = {
  apiClient: ApiClient;
  createdEmail?: string | null;
  onSignedIn: (user: User) => void;
};

const inputClassName =
  "mt-1 block w-full rounded-md border border-zinc-500 bg-transparent px-3 py-2";

export function SignInScreen({
  apiClient,
  createdEmail,
  onSignedIn,
}: SignInScreenProps) {
  const { mutate, error, isPending } = useMutation(
    signInMutationOptions(apiClient),
  );
  const failureMessage =
    error &&
    (error instanceof ApiError && error.status === 401
      ? "E-mail ou senha incorretos"
      : getFailureReason(error));

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    mutate(
      {
        email: String(form.get("email")),
        password: String(form.get("password")),
      },
      { onSuccess: onSignedIn },
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        className="w-full max-w-sm rounded-lg border border-zinc-300 p-6 dark:border-zinc-700"
        onSubmit={handleSubmit}
      >
        <p className="text-center text-lg font-bold">DistriLux</p>
        <h1 className="mt-4 text-center text-2xl font-semibold">
          Entrar no portal
        </h1>
        <p className="mt-2 text-center text-sm">
          Use o e-mail e a senha da DistriLux.
        </p>
        {createdEmail ? (
          <p className="mt-4 text-center text-sm" role="status">
            Senha criada. Entre com seu e-mail e senha.
          </p>
        ) : null}
        <label className="mt-6 block text-sm font-medium">
          E-mail
          <input
            autoComplete="username"
            defaultValue={createdEmail ?? ""}
            className={inputClassName}
            name="email"
            required
            type="email"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Senha
          <input
            autoComplete="current-password"
            className={inputClassName}
            name="password"
            required
            type="password"
          />
        </label>
        {failureMessage ? (
          <p
            className="mt-4 text-sm text-red-700 dark:text-red-400"
            role="alert"
          >
            {failureMessage}
          </p>
        ) : null}
        <button
          className="bg-foreground text-background mt-6 w-full rounded-md px-4 py-2 font-medium"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

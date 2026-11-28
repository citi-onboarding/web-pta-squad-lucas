import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { env } from "@/shared/lib/env/env";
import { createQueryClient } from "@/shared/lib/query/create-query-client";
import { server } from "@/shared/testing/msw/server";

import { routes } from "./router";
import {
  failureReasons,
  handleIdentity,
  renderAt,
  unauthorized,
} from "./testing/router-harness";

const lookupUrl = new URL(
  "api/v1/invitations/lookup",
  env.VITE_API_URL,
).toString();
const acceptUrl = new URL(
  "api/v1/invitations/accept",
  env.VITE_API_URL,
).toString();
const token = "T0kenAbcdefghijklmnopqrstuvwxyz0123456789_-AB";
const invitedName = "Nova Pessoa";
const invitedEmail = "nova@distrilux.com.br";
const unusableMessage =
  "Este link de convite não vale mais. Ele pode ter vencido ou já ter sido usado. Peça um novo link ao administrador.";
const serverReason =
  "O servidor não conseguiu responder corretamente. Tente novamente em instantes.";
const validPassword = "senha-segura-123";

function unusable() {
  return HttpResponse.json(
    { title: "Not Found", detail: "SERVER DETAIL", status: 404 },
    { status: 404 },
  );
}

// Simulates the public invitation endpoints and records what the server receives.
function handleInvitationApi(
  options: {
    lookup?: () => Response | Promise<Response>;
    accept?: () => Response | Promise<Response>;
  } = {},
) {
  const requests = {
    lookup: [] as unknown[],
    accept: [] as unknown[],
  };

  server.use(
    http.post(lookupUrl, async ({ request }) => {
      requests.lookup.push(await request.json());

      return (
        options.lookup?.() ??
        HttpResponse.json({
          name: invitedName,
          email: invitedEmail,
          expiresAt: "2026-11-30T15:30:00Z",
        })
      );
    }),
    http.post(acceptUrl, async ({ request }) => {
      requests.accept.push(await request.json());

      return options.accept?.() ?? new HttpResponse(null, { status: 204 });
    }),
  );

  return requests;
}

// The page reads the fragment from the address bar, so both the browser URL and
// the router start at the invitation link.
function openInvitation(hash = `#${token}`) {
  window.history.replaceState(null, "", `/criar-senha${hash}`);

  return renderAt(`/criar-senha${hash}`);
}

async function fillPasswords(password: string, confirmation = password) {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText("Senha"), password);
  await user.type(screen.getByLabelText("Confirmar senha"), confirmation);
  await user.click(screen.getByRole("button", { name: "Criar senha" }));

  return user;
}

beforeEach(() => {
  handleIdentity(unauthorized);
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Invitation page", () => {
  it("checks a usable invitation with the token in the body and removes the fragment", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests = handleInvitationApi({
      lookup: async () => {
        await gate;

        return HttpResponse.json({
          name: invitedName,
          email: invitedEmail,
          expiresAt: "2026-11-30T15:30:00Z",
        });
      },
    });

    window.history.replaceState(null, "", `/criar-senha#${token}`);

    const historyLength = window.history.length;

    renderAt(`/criar-senha#${token}`);

    expect(await screen.findByText("Verificando convite…")).toBeVisible();

    release();

    expect(
      await screen.findByRole("heading", { name: "Criar senha" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        `Olá, ${invitedName}. Crie a senha para entrar com ${invitedEmail}.`,
      ),
    ).toBeVisible();
    expect(requests.lookup).toEqual([{ token }]);
    expect(window.location.pathname).toBe("/criar-senha");
    expect(window.location.hash).toBe("");
    expect(window.history.length).toBe(historyLength);

    for (const storage of [window.localStorage, window.sessionStorage]) {
      expect(JSON.stringify({ ...storage })).not.toContain(token);
    }
  });

  it("shows the unusable message and no password field when the server refuses the link", async () => {
    handleInvitationApi({ lookup: unusable });
    openInvitation();

    expect(await screen.findByText(unusableMessage)).toBeVisible();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(screen.queryByText("SERVER DETAIL")).not.toBeInTheDocument();
  });

  it("shows the unusable message without a request when the address has no token", async () => {
    const requests = handleInvitationApi();

    openInvitation("");

    expect(await screen.findByText(unusableMessage)).toBeVisible();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(requests.lookup).toEqual([]);
  });

  it("shows the check failure with its reason and recovers on retry", async () => {
    let failing = true;
    const requests = handleInvitationApi({
      lookup: () =>
        failing
          ? HttpResponse.json({ title: "x", status: 500 }, { status: 500 })
          : HttpResponse.json({
              name: invitedName,
              email: invitedEmail,
              expiresAt: "2026-11-30T15:30:00Z",
            }),
    });

    openInvitation();

    expect(
      await screen.findByText("Não foi possível verificar o convite."),
    ).toBeVisible();
    expect(screen.getByText(serverReason)).toBeVisible();

    failing = false;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByLabelText("Senha")).toBeVisible();
    expect(requests.lookup).toEqual([{ token }, { token }]);
  });
});

describe("Password creation", () => {
  it("shows the fields, the hint and the button", async () => {
    handleInvitationApi();
    openInvitation();

    expect(await screen.findByLabelText("Senha")).toBeRequired();
    expect(screen.getByLabelText("Confirmar senha")).toBeRequired();
    expect(screen.getByText("Use de 8 a 72 caracteres.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Criar senha" })).toBeVisible();
  });

  it("sends the token and the password and goes to the sign-in screen", async () => {
    const requests = handleInvitationApi();
    const router = openInvitation();

    await fillPasswords(validPassword);

    expect(
      await screen.findByRole("heading", { name: "Entrar no portal" }),
    ).toBeVisible();
    expect(requests.accept).toEqual([{ token, password: validPassword }]);
    expect(router.state.location.pathname).toBe("/entrar");
  });

  it.each([
    {
      title: "a 7-character password",
      password: "abcdefg",
      confirmation: "abcdefg",
      message: "A senha precisa ter pelo menos 8 caracteres.",
    },
    {
      title: "40 accented characters (80 bytes)",
      password: "é".repeat(40),
      confirmation: "é".repeat(40),
      message: "A senha é longa demais. Use no máximo 72 caracteres.",
    },
    {
      title: "a different confirmation",
      password: validPassword,
      confirmation: "outra-senha-123",
      message: "As senhas não são iguais.",
    },
  ])(
    "shows the message for $title without sending a request",
    async ({ password, confirmation, message }) => {
      const requests = handleInvitationApi();

      openInvitation();
      await fillPasswords(password, confirmation);

      expect(await screen.findByText(message)).toBeVisible();
      expect(requests.accept).toEqual([]);
    },
  );

  it("shows the unusable message instead of the form when the link was used meanwhile", async () => {
    handleInvitationApi({ accept: unusable });
    openInvitation();

    await fillPasswords(validPassword);

    expect(await screen.findByText(unusableMessage)).toBeVisible();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("disables the button while pending and shows the connection reason afterwards", async () => {
    let fail: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      fail = resolve;
    });

    handleInvitationApi({
      accept: async () => {
        await gate;

        return HttpResponse.error();
      },
    });
    openInvitation();
    await fillPasswords(validPassword);

    const pending = await screen.findByRole("button", { name: "Criando…" });

    expect(pending).toBeDisabled();

    fail();

    expect(await screen.findByText(failureReasons.connection)).toBeVisible();
    expect(screen.getByLabelText("Senha")).toBeVisible();
    expect(screen.getByRole("button", { name: "Criar senha" })).toBeEnabled();
  });
});

describe("Sign-in after password creation", () => {
  async function createPassword() {
    handleInvitationApi();

    const router = openInvitation();

    await fillPasswords(validPassword);
    await screen.findByRole("heading", { name: "Entrar no portal" });

    return router;
  }

  it("shows the notice and the invited email, with an empty password", async () => {
    await createPassword();

    expect(
      await screen.findByText("Senha criada. Entre com seu e-mail e senha."),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveValue(
      invitedEmail,
    );
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("does not show the notice again after a reload", async () => {
    const router = await createPassword();

    await screen.findByText("Senha criada. Entre com seu e-mail e senha.");

    // A reload keeps the history entry, including its state, but drops the page.
    const entry = router.state.location;

    cleanup();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider
          router={createMemoryRouter(routes, { initialEntries: [entry] })}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Entrar no portal" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByText("Senha criada. Entre com seu e-mail e senha."),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveValue("");
  });
});

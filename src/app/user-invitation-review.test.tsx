import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { env } from "@/shared/lib/env/env";
import { server } from "@/shared/testing/msw/server";

import {
  buildUser,
  endSessionOnSignOut,
  expectNoInternalContent,
  failureReasons,
  handleIdentity,
  handleSession,
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
const firstToken = "A".repeat(43);
const secondToken = "B".repeat(43);
const invitedEmail = "nova@distrilux.com.br";
const validPassword = "senha-segura-123";
const unusableMessage =
  "Este link de convite não vale mais. Ele pode ter vencido ou já ter sido usado. Peça um novo link ao administrador.";
const notice = "Senha criada. Entre com seu e-mail e senha.";
const signOutFailure =
  "Senha criada, mas não foi possível sair da conta conectada.";

const invitations: Record<string, { name: string; email: string }> = {
  [firstToken]: { name: "Primeira Pessoa", email: "primeira@distrilux.com.br" },
  [secondToken]: { name: "Nova Pessoa", email: invitedEmail },
};

function handleInvitationApi(unusableTokens: string[] = []) {
  const requests = { lookup: [] as unknown[], accept: [] as unknown[] };

  server.use(
    http.post(lookupUrl, async ({ request }) => {
      const body = (await request.json()) as { token: string };

      requests.lookup.push(body);

      return unusableTokens.includes(body.token)
        ? HttpResponse.json(
            { title: "Not Found", status: 404 },
            { status: 404 },
          )
        : HttpResponse.json({
            ...invitations[body.token],
            expiresAt: "2026-11-30T15:30:00Z",
          });
    }),
    http.post(acceptUrl, async ({ request }) => {
      requests.accept.push(await request.json());

      return new HttpResponse(null, { status: 204 });
    }),
  );

  return requests;
}

function openInvitation(token: string) {
  window.history.replaceState(null, "", `/criar-senha#${token}`);

  return renderAt(`/criar-senha#${token}`);
}

// What pasting another link in the same tab does: only the fragment changes.
function openInSameTab(token: string) {
  window.location.hash = token;
}

async function createPassword() {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText("Senha"), validPassword);
  await user.type(screen.getByLabelText("Confirmar senha"), validPassword);
  await user.click(screen.getByRole("button", { name: "Criar senha" }));

  return user;
}

async function expectSignInWithNotice() {
  expect(await screen.findByText(notice)).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Entrar no portal" }),
  ).toBeVisible();
  expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveValue(
    invitedEmail,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Another link in the same tab", () => {
  beforeEach(() => {
    handleIdentity(unauthorized);
  });

  it("checks and shows a new link opened over an unusable one", async () => {
    const requests = handleInvitationApi([firstToken]);

    openInvitation(firstToken);
    await screen.findByText(unusableMessage);

    openInSameTab(secondToken);

    expect(
      await screen.findByText(
        `Olá, Nova Pessoa. Crie a senha para entrar com ${invitedEmail}.`,
      ),
    ).toBeVisible();
    expect(screen.queryByText(unusableMessage)).not.toBeInTheDocument();
    expect(requests.lookup).toEqual([
      { token: firstToken },
      { token: secondToken },
    ]);
    expect(window.location.hash).toBe("");
  });

  it("discards the typed passwords and the earlier invitation", async () => {
    handleInvitationApi();
    openInvitation(firstToken);

    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Senha"), "abc");
    await user.type(screen.getByLabelText("Confirmar senha"), "abc");
    await user.click(screen.getByRole("button", { name: "Criar senha" }));
    await screen.findByText("A senha precisa ter pelo menos 8 caracteres.");

    openInSameTab(secondToken);

    expect(await screen.findByText(/Olá, Nova Pessoa\./)).toBeVisible();
    expect(screen.queryByText(/Primeira Pessoa/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar senha")).toHaveValue("");
    expect(
      screen.queryByText("A senha precisa ter pelo menos 8 caracteres."),
    ).not.toBeInTheDocument();
  });
});

describe("Password creation ends another open session", () => {
  it("ends the signed-in session before showing the sign-in screen", async () => {
    const { session } = handleSession("ADMIN");
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const signOutRequests: Request[] = [];

    server.use(
      http.post(
        new URL("api/v1/auth/logout", env.VITE_API_URL).toString(),
        async ({ request }) => {
          signOutRequests.push(request);
          await gate;
          session.active = false;

          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    handleInvitationApi();
    openInvitation(secondToken);
    await createPassword();

    await waitFor(() => expect(signOutRequests).toHaveLength(1));
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Entrar no portal" }),
    ).not.toBeInTheDocument();
    expectNoInternalContent();

    release();

    await expectSignInWithNotice();
    expectNoInternalContent();
  });

  it("treats a session that had already ended as ended", async () => {
    const { session } = handleSession("ADMIN");
    const signOutRequests = endSessionOnSignOut(session, unauthorized);

    handleInvitationApi();
    openInvitation(secondToken);
    await createPassword();

    await expectSignInWithNotice();
    expect(signOutRequests).toHaveLength(1);
    expect(screen.queryByText(signOutFailure)).not.toBeInTheDocument();
  });

  it("shows the failure when ending the session fails and recovers on retry", async () => {
    const { session } = handleSession("ADMIN");
    let failing = true;
    const signOutRequests: Request[] = [];

    server.use(
      http.post(
        new URL("api/v1/auth/logout", env.VITE_API_URL).toString(),
        ({ request }) => {
          signOutRequests.push(request);

          if (failing) {
            return HttpResponse.error();
          }

          session.active = false;

          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    const requests = handleInvitationApi();

    openInvitation(secondToken);

    const user = await createPassword();

    expect(await screen.findByText(signOutFailure)).toBeVisible();
    expect(screen.getByText(failureReasons.connection)).toBeVisible();
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expectNoInternalContent();

    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await expectSignInWithNotice();
    expect(signOutRequests).toHaveLength(2);
    expect(requests.accept).toHaveLength(1);
  });

  it("shows the failure when checking the session fails and recovers on retry", async () => {
    const session = { active: true };
    let failing = true;

    handleIdentity(() => {
      if (failing) {
        return HttpResponse.json({ title: "x", status: 500 }, { status: 500 });
      }

      return session.active
        ? HttpResponse.json(buildUser("ADMIN"))
        : unauthorized();
    });

    const signOutRequests = endSessionOnSignOut(session);
    const requests = handleInvitationApi();

    openInvitation(secondToken);

    const user = await createPassword();

    expect(await screen.findByText(signOutFailure)).toBeVisible();
    expect(
      screen.getByText(
        "O servidor não conseguiu responder corretamente. Tente novamente em instantes.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expectNoInternalContent();

    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await expectSignInWithNotice();
    expect(requests.accept).toHaveLength(1);
    expect(signOutRequests).toHaveLength(1);
  });
});

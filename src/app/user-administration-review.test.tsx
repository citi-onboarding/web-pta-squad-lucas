import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/shared/testing/msw/server";

import {
  expectSignedOut,
  renderAt,
  unauthorized,
} from "./testing/router-harness";
import {
  erpSellerNamesUrl,
  expectedLink,
  handleUserApi,
  invitationsUrl,
  invitedFinance,
  openRegistrationDialog,
  seller,
  signInAsAdmin,
  token,
  usersUrl,
} from "./testing/user-administration-harness";

const serverReason =
  "O servidor não conseguiu responder corretamente. Tente novamente em instantes.";
const erpField = "Vendedor no ERP (só para vendedores)";

function deferred() {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return { gate, release };
}

async function fillManager(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
) {
  await user.type(within(dialog).getByLabelText("Nome"), "Nova Pessoa");
  await user.type(
    within(dialog).getByLabelText("E-mail"),
    "nova@distrilux.com.br",
  );
  await user.selectOptions(within(dialog).getByLabelText("Papel"), "Gerente");
}

async function openRenewal() {
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: /Fabiana Costa/ });

  await user.click(
    within(row).getByRole("button", { name: "Gerar novo link" }),
  );

  return { user, dialog: await screen.findByRole("dialog") };
}

describe("Ended session on the user page", () => {
  // The identity check succeeds until a request finds the session ended.
  function endSession(session: { active: boolean }) {
    return () => {
      session.active = false;

      return unauthorized();
    };
  }

  async function expectSignInWithoutInternalContent(
    router: ReturnType<typeof renderAt>,
  ) {
    await expectSignedOut(router);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(seller.email)).not.toBeInTheDocument();
    expect(screen.queryByText(invitedFinance.email)).not.toBeInTheDocument();
  }

  it("shows the sign-in screen when listing users answers unauthorized", async () => {
    const { session, identityRequests } = signInAsAdmin();

    handleUserApi([seller]);
    server.use(http.get(usersUrl, endSession(session)));

    const router = renderAt("/usuarios");

    await expectSignInWithoutInternalContent(router);
    expect(identityRequests.length).toBeGreaterThan(1);
  });

  it("shows the sign-in screen when listing ERP seller names answers unauthorized", async () => {
    const { session } = signInAsAdmin();

    handleUserApi([seller]);
    server.use(http.get(erpSellerNamesUrl, endSession(session)));

    const router = renderAt("/usuarios");

    await openRegistrationDialog();

    await expectSignInWithoutInternalContent(router);
  });

  it("shows the sign-in screen when a registration answers unauthorized", async () => {
    const { session } = signInAsAdmin();

    handleUserApi([seller]);
    server.use(http.post(usersUrl, endSession(session)));

    const router = renderAt("/usuarios");
    const { user, dialog } = await openRegistrationDialog();

    await fillManager(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    await expectSignInWithoutInternalContent(router);
  });

  it("shows the sign-in screen when a new invitation answers unauthorized", async () => {
    const { session } = signInAsAdmin();

    handleUserApi([invitedFinance]);
    server.use(
      http.post(invitationsUrl(invitedFinance.id), endSession(session)),
    );

    const router = renderAt("/usuarios");
    const { user, dialog } = await openRenewal();

    await user.click(
      within(dialog).getByRole("button", { name: "Gerar novo link" }),
    );

    await expectSignInWithoutInternalContent(router);
  });
});

describe("Pending submission cannot be abandoned", () => {
  async function startRegistration() {
    signInAsAdmin();
    handleUserApi([seller]);

    const { gate, release } = deferred();

    server.use(
      http.post(usersUrl, async () => {
        await gate;

        return HttpResponse.json(
          {
            user: {
              ...invitedFinance,
              name: "Nova Pessoa",
              email: "nova@distrilux.com.br",
              role: "MANAGER",
            },
            invitation: { token, expiresAt: "2026-11-30T15:30:00Z" },
          },
          { status: 201 },
        );
      }),
    );
    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();

    await fillManager(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));
    await within(dialog).findByRole("button", { name: "Cadastrando…" });

    return { user, dialog, release };
  }

  async function startNewInvitation() {
    signInAsAdmin();
    handleUserApi([invitedFinance]);

    const { gate, release } = deferred();
    let requested = false;

    server.use(
      http.post(invitationsUrl(invitedFinance.id), async () => {
        requested = true;
        await gate;

        return HttpResponse.json(
          { token, expiresAt: "2026-11-30T15:30:00Z" },
          { status: 201 },
        );
      }),
    );
    renderAt("/usuarios");

    const { user, dialog } = await openRenewal();

    await user.click(
      within(dialog).getByRole("button", { name: "Gerar novo link" }),
    );
    await waitFor(() => expect(requested).toBe(true));

    return { user, dialog, release };
  }

  const submissions = [
    { submission: "registration", start: startRegistration },
    { submission: "a new invitation", start: startNewInvitation },
  ];

  it.each(submissions)(
    "disables Cancel during $submission and then shows the link",
    async ({ start }) => {
      const { user, dialog, release } = await start();
      const cancel = within(dialog).getByRole("button", { name: "Cancelar" });

      expect(cancel).toBeDisabled();

      await user.click(cancel);

      expect(dialog).toBeInTheDocument();

      release();

      expect(
        await screen.findByDisplayValue(expectedLink()),
      ).toBeInTheDocument();
    },
  );

  // jsdom has no native Escape handling for dialogs, so this covers the dialog
  // `cancel` event. The real key is covered by Playwright.
  it.each(submissions)(
    "keeps the dialog open on its cancel event during $submission and then shows the link",
    async ({ start }) => {
      const { dialog, release } = await start();
      const cancelEvent = new Event("cancel", { cancelable: true });

      fireEvent(dialog, cancelEvent);

      expect(cancelEvent.defaultPrevented).toBe(true);
      expect(dialog).toBeInTheDocument();

      release();

      expect(
        await screen.findByDisplayValue(expectedLink()),
      ).toBeInTheDocument();
    },
  );
});

describe("ERP seller names loading and failure", () => {
  it("disables the field and the button while the names load", async () => {
    signInAsAdmin();
    handleUserApi([seller]);

    const { gate, release } = deferred();

    server.use(
      http.get(erpSellerNamesUrl, async () => {
        await gate;

        return HttpResponse.json(["Ana Souza"]);
      }),
    );
    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();
    const field = within(dialog).getByLabelText(erpField);

    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Vendedor",
    );

    expect(field).toBeDisabled();
    expect(within(dialog).getByText("Carregando vendedores…")).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Cadastrar" }),
    ).toBeDisabled();

    release();

    await waitFor(() => expect(field).toBeEnabled());
    expect(
      within(field).getByRole("option", { name: "Ana Souza" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Carregando vendedores…"),
    ).not.toBeInTheDocument();
  });

  it("shows the failure with its reason, blocks the seller and recovers on retry", async () => {
    signInAsAdmin();

    const api = handleUserApi([seller]);
    let failing = true;

    server.use(
      http.get(erpSellerNamesUrl, () =>
        failing
          ? HttpResponse.json({ title: "x", status: 500 }, { status: 500 })
          : HttpResponse.json(["Ana Souza"]),
      ),
    );
    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();

    await user.type(within(dialog).getByLabelText("Nome"), "Ana Souza");
    await user.type(
      within(dialog).getByLabelText("E-mail"),
      "ana.nova@distrilux.com.br",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Vendedor",
    );

    expect(
      await within(dialog).findByText(
        "Não foi possível carregar os vendedores do ERP.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText(serverReason)).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    expect(api.registrations).toEqual([]);

    failing = false;
    await user.click(
      within(dialog).getByRole("button", { name: "Tentar novamente" }),
    );

    expect(
      await within(dialog).findByRole("option", { name: "Ana Souza" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(
        "Não foi possível carregar os vendedores do ERP.",
      ),
    ).not.toBeInTheDocument();
  });
});

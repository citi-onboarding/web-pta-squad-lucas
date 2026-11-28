import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createQueryClient } from "@/shared/lib/query/create-query-client";
import { server } from "@/shared/testing/msw/server";

import { failureReasons, renderAt } from "./testing/router-harness";
import {
  conflict,
  expectedLink,
  expiredAdmin,
  fakeClipboard,
  handleUserApi,
  invitationsUrl,
  invitedFinance,
  manager,
  messages,
  openRegistrationDialog,
  seller,
  signInAsAdmin,
  token,
  usersUrl,
} from "./testing/user-administration-harness";

const serverReason =
  "O servidor não conseguiu responder corretamente. Tente novamente em instantes.";
const originalTimeZone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/Maceio";
});

afterAll(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimeZone;
  }
});

beforeEach(() => {
  signInAsAdmin();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function rowOf(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) });
}

function cellsOf(name: string) {
  return within(rowOf(name))
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
}

describe("User list", () => {
  it("shows the subtitle, the columns and the loading text while the list loads", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    handleUserApi([]);
    server.use(
      http.get(usersUrl, async () => {
        await gate;

        return HttpResponse.json([seller]);
      }),
    );
    renderAt("/usuarios");

    expect(await screen.findByText("Carregando usuários…")).toBeInTheDocument();

    release();

    expect(await screen.findByRole("row", { name: /Ana Souza/ })).toBeVisible();

    expect(
      await screen.findByText(
        "Não há autocadastro. Cada vendedor é ligado ao vendedor do ERP, que define a carteira.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Nome", "E-mail", "Papel", "Vendedor no ERP", "Último acesso"]);
    expect(screen.queryByText("Carregando usuários…")).not.toBeInTheDocument();
  });

  it("lists users with role names, ERP seller, last access and invitation state", async () => {
    handleUserApi([seller, manager, invitedFinance, expiredAdmin]);
    renderAt("/usuarios");

    expect(await screen.findByRole("row", { name: /Ana Souza/ })).toBeVisible();
    expect(cellsOf("Ana Souza")).toEqual([
      "Ana Souza",
      "ana@distrilux.com.br",
      "Vendedor",
      "ANA SOUZA ERP",
      "27/11/2026 12:30",
    ]);
    expect(cellsOf("Marcos Lima")).toEqual([
      "Marcos Lima",
      "marcos@distrilux.com.br",
      "Gerente",
      "—",
      "Nunca acessou",
    ]);
    expect(cellsOf("Fabiana Costa")).toEqual([
      "Fabiana Costa",
      "fabiana@distrilux.com.br",
      "Financeiro",
      "—",
      "Convite pendente até 29/11/2026 15:00",
    ]);
    expect(cellsOf("Dora Alves")).toEqual([
      "Dora Alves",
      "dora@distrilux.com.br",
      "Administrador",
      "—",
      "Convite vencido",
    ]);
  });

  it("shows the failure with its reason and recovers on retry", async () => {
    handleUserApi([seller]);

    let failing = true;

    server.use(
      http.get(usersUrl, () =>
        failing
          ? HttpResponse.json({ title: "x", status: 500 }, { status: 500 })
          : HttpResponse.json([seller]),
      ),
    );
    renderAt("/usuarios");

    expect(await screen.findByText(messages.loadFailure)).toBeInTheDocument();
    expect(screen.getByText(serverReason)).toBeInTheDocument();
    expect(screen.queryByText("SERVER DETAIL")).not.toBeInTheDocument();

    failing = false;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("row", { name: /Ana Souza/ })).toBeVisible();
    expect(screen.queryByText(messages.loadFailure)).not.toBeInTheDocument();
  });
});

describe("User registration", () => {
  it("registers a manager without an ERP seller name and lists the new user", async () => {
    const api = handleUserApi([seller]);

    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();

    expect(
      within(dialog).getByText("A pessoa recebe um link para criar a senha."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Nome"), "Nova Pessoa");
    await user.type(
      within(dialog).getByLabelText("E-mail"),
      "nova@distrilux.com.br",
    );
    await user.selectOptions(within(dialog).getByLabelText("Papel"), "Gerente");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByDisplayValue(expectedLink())).toBeInTheDocument();
    expect(api.registrations).toEqual([
      { name: "Nova Pessoa", email: "nova@distrilux.com.br", role: "MANAGER" },
    ]);

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(
      await screen.findByRole("row", { name: /Nova Pessoa/ }),
    ).toBeVisible();
    expect(cellsOf("Nova Pessoa")[4]).toBe(
      "Convite pendente até 30/11/2026 12:30",
    );
  });

  it("requires one of the available ERP seller names for a seller", async () => {
    const api = handleUserApi([seller]);

    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();
    const erpField = within(dialog).getByLabelText(
      "Vendedor no ERP (só para vendedores)",
    );

    await user.type(within(dialog).getByLabelText("Nome"), "Bruno Lima");
    await user.type(
      within(dialog).getByLabelText("E-mail"),
      "bruno@distrilux.com.br",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Vendedor",
    );

    await waitFor(() => expect(erpField).toBeEnabled());
    expect(
      within(erpField)
        .getAllByRole("option")
        .filter((option) => (option as HTMLOptionElement).value !== "")
        .map((option) => option.textContent),
    ).toEqual(["Ana Souza", "Bruno Lima"]);

    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    expect(api.registrations).toEqual([]);

    await user.selectOptions(erpField, "Bruno Lima");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(api.registrations).toEqual([
        {
          name: "Bruno Lima",
          email: "bruno@distrilux.com.br",
          role: "SELLER",
          erpSellerName: "Bruno Lima",
        },
      ]),
    );
  });

  it("disables the ERP seller field and sends no ERP seller name after the role changes", async () => {
    const api = handleUserApi([seller]);

    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();
    const erpField = within(dialog).getByLabelText(
      "Vendedor no ERP (só para vendedores)",
    );

    await user.type(within(dialog).getByLabelText("Nome"), "Troca Papel");
    await user.type(
      within(dialog).getByLabelText("E-mail"),
      "troca@distrilux.com.br",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Vendedor",
    );
    await waitFor(() => expect(erpField).toBeEnabled());
    await user.selectOptions(erpField, "Ana Souza");
    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Financeiro",
    );

    expect(erpField).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    await waitFor(() =>
      expect(api.registrations).toEqual([
        {
          name: "Troca Papel",
          email: "troca@distrilux.com.br",
          role: "FINANCE",
        },
      ]),
    );
  });

  it("explains that no ERP seller name is available and blocks seller registration", async () => {
    handleUserApi([seller], { erpSellerNames: [] });
    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();

    await user.selectOptions(
      within(dialog).getByLabelText("Papel"),
      "Vendedor",
    );

    expect(await within(dialog).findByText(messages.noErpSeller)).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Cadastrar" }),
    ).toBeDisabled();
  });

  it.each([
    {
      field: "email",
      message: messages.emailConflict,
      label: "E-mail",
    },
    {
      field: "erpSellerName",
      message: messages.erpConflict,
      label: "Vendedor no ERP (só para vendedores)",
    },
  ])(
    "shows the $field conflict next to its field and keeps the typed data",
    async ({ field, message, label }) => {
      handleUserApi([seller]);
      server.use(http.post(usersUrl, () => conflict(field)));
      renderAt("/usuarios");

      const { user, dialog } = await openRegistrationDialog();

      await user.type(within(dialog).getByLabelText("Nome"), "Conflito");
      await user.type(
        within(dialog).getByLabelText("E-mail"),
        "conflito@distrilux.com.br",
      );
      await user.selectOptions(
        within(dialog).getByLabelText("Papel"),
        "Vendedor",
      );
      await waitFor(() =>
        expect(
          within(dialog).getByLabelText("Vendedor no ERP (só para vendedores)"),
        ).toBeEnabled(),
      );
      await user.selectOptions(
        within(dialog).getByLabelText("Vendedor no ERP (só para vendedores)"),
        "Ana Souza",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Cadastrar" }),
      );

      expect(await within(dialog).findByText(message)).toBeVisible();
      expect(within(dialog).getByLabelText(label)).toHaveAccessibleDescription(
        message,
      );
      expect(
        within(dialog).queryByText("SERVER DETAIL"),
      ).not.toBeInTheDocument();
      expect(within(dialog).getByLabelText("Nome")).toHaveValue("Conflito");
      expect(within(dialog).getByLabelText("E-mail")).toHaveValue(
        "conflito@distrilux.com.br",
      );
    },
  );

  it("disables the button while pending and shows the connection reason afterwards", async () => {
    handleUserApi([seller]);

    let fail: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      fail = resolve;
    });

    server.use(
      http.post(usersUrl, async () => {
        await gate;

        return HttpResponse.error();
      }),
    );
    renderAt("/usuarios");

    const { user, dialog } = await openRegistrationDialog();

    await user.type(within(dialog).getByLabelText("Nome"), "Sem Rede");
    await user.type(
      within(dialog).getByLabelText("E-mail"),
      "semrede@distrilux.com.br",
    );
    await user.selectOptions(within(dialog).getByLabelText("Papel"), "Gerente");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    const pending = await within(dialog).findByRole("button", {
      name: "Cadastrando…",
    });

    expect(pending).toBeDisabled();

    fail();

    expect(
      await within(dialog).findByText(failureReasons.connection),
    ).toBeVisible();
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Sem Rede");
    expect(within(dialog).getByLabelText("E-mail")).toHaveValue(
      "semrede@distrilux.com.br",
    );
    expect(
      within(dialog).getByRole("button", { name: "Cadastrar" }),
    ).toBeEnabled();
  });
});

async function registerManager() {
  const { user, dialog } = await openRegistrationDialog();

  await user.type(within(dialog).getByLabelText("Nome"), "Nova Pessoa");
  await user.type(
    within(dialog).getByLabelText("E-mail"),
    "nova@distrilux.com.br",
  );
  await user.selectOptions(within(dialog).getByLabelText("Papel"), "Gerente");

  const writeText = fakeClipboard(() => Promise.resolve());

  await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

  return { user, writeText };
}

describe("Invitation link delivery", () => {
  it("shows the link in a read-only field and copies exactly that link", async () => {
    handleUserApi([seller]);
    renderAt("/usuarios");

    const { user, writeText } = await registerManager();
    const field = await screen.findByDisplayValue(expectedLink());

    expect(field).toHaveAttribute("readonly");
    expect(
      screen.getByText(
        "Entregue este link a Nova Pessoa. Ele vale até 30/11/2026 12:30 e só pode ser usado uma vez. Por segurança, ele não será mostrado de novo.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(expectedLink());
    expect(await screen.findByText(messages.copied)).toBeVisible();
  });

  it("tells the administrator to copy manually when the clipboard refuses", async () => {
    handleUserApi([seller]);
    renderAt("/usuarios");

    const { user } = await registerManager();
    const field = await screen.findByDisplayValue(expectedLink());

    fakeClipboard(() => Promise.reject(new DOMException("denied")));
    await user.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(await screen.findByText(messages.copyRefused)).toBeVisible();
    expect(screen.queryByText(messages.copied)).not.toBeInTheDocument();
    expect(field).toBeVisible();
    expect(field).not.toBeDisabled();
  });

  it("does not show the link again after closing and reloading", async () => {
    handleUserApi([seller]);

    const queryClient = createQueryClient();

    renderAt("/usuarios", queryClient);
    const { user } = await registerManager();

    await screen.findByDisplayValue(expectedLink());
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) =>
          JSON.stringify(mutation.state.data ?? null).includes(token),
        ),
    ).toBe(false);

    expect(screen.queryByDisplayValue(expectedLink())).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(token);

    cleanup();
    renderAt("/usuarios", createQueryClient());

    expect(
      await screen.findByRole("row", { name: /Nova Pessoa/ }),
    ).toBeVisible();
    expect(screen.queryByDisplayValue(expectedLink())).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(token);

    for (const storage of [window.localStorage, window.sessionStorage]) {
      expect(JSON.stringify({ ...storage })).not.toContain(token);
    }
  });
});

describe("New invitation link", () => {
  it("renews an expired invitation, shows the link and updates the row", async () => {
    const api = handleUserApi([seller, expiredAdmin]);

    renderAt("/usuarios");

    const user = userEvent.setup();
    const row = await screen.findByRole("row", { name: /Dora Alves/ });

    expect(cellsOf("Dora Alves")[4]).toBe("Convite vencido");

    await user.click(
      within(row).getByRole("button", { name: "Gerar novo link" }),
    );

    const confirmation = await screen.findByRole("dialog");

    expect(
      within(confirmation).getByText(
        "Gerar um novo link para Dora Alves? O link anterior deixa de funcionar.",
      ),
    ).toBeVisible();

    fakeClipboard(() => Promise.resolve());
    await user.click(
      within(confirmation).getByRole("button", { name: "Gerar novo link" }),
    );

    expect(await screen.findByDisplayValue(expectedLink())).toBeInTheDocument();
    expect(api.invitationRequests).toEqual([expiredAdmin.id]);
    expect(
      screen.getByText(
        /Entregue este link a Dora Alves\. Ele vale até 30\/11\/2026 12:30/,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() =>
      expect(cellsOf("Dora Alves")[4]).toBe(
        "Convite pendente até 30/11/2026 12:30",
      ),
    );
  });

  it("shows the failure reason when the new link cannot be generated", async () => {
    handleUserApi([invitedFinance]);
    server.use(
      http.post(invitationsUrl(invitedFinance.id), () => HttpResponse.error()),
    );
    renderAt("/usuarios");

    const user = userEvent.setup();
    const row = await screen.findByRole("row", { name: /Fabiana Costa/ });

    await user.click(
      within(row).getByRole("button", { name: "Gerar novo link" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Gerar novo link",
      }),
    );

    expect(await screen.findByText(failureReasons.connection)).toBeVisible();
    expect(screen.queryByDisplayValue(expectedLink())).not.toBeInTheDocument();
  });

  it("sends no request when the renewal is cancelled", async () => {
    const api = handleUserApi([invitedFinance]);

    renderAt("/usuarios");

    const user = userEvent.setup();
    const row = await screen.findByRole("row", { name: /Fabiana Costa/ });

    await user.click(
      within(row).getByRole("button", { name: "Gerar novo link" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Cancelar",
      }),
    );

    expect(api.invitationRequests).toEqual([]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers the action only on pending and expired invitations", async () => {
    handleUserApi([seller, manager, invitedFinance, expiredAdmin]);
    renderAt("/usuarios");

    await screen.findByRole("row", { name: /Ana Souza/ });

    for (const name of ["Ana Souza", "Marcos Lima"]) {
      expect(
        within(rowOf(name)).queryByRole("button", { name: "Gerar novo link" }),
      ).not.toBeInTheDocument();
    }

    for (const name of ["Fabiana Costa", "Dora Alves"]) {
      expect(
        within(rowOf(name)).getByRole("button", { name: "Gerar novo link" }),
      ).toBeVisible();
    }

    expect(
      screen.getAllByRole("button", { name: "Gerar novo link" }),
    ).toHaveLength(2);
  });
});

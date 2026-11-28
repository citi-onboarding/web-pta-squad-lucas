import { screen, within } from "@testing-library/react";
import { HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import {
  buildUser,
  unauthorized,
  handleIdentity,
  renderAt,
} from "./testing/router-harness";

const roleMenus = [
  {
    role: "SELLER",
    entries: [
      ["Clientes", "/clientes"],
      ["Clientes em risco", "/clientes-em-risco"],
      ["Triagem de documentos", "/triagem"],
      ["Meus pedidos", "/pedidos"],
    ],
  },
  {
    role: "MANAGER",
    entries: [
      ["Painel do comercial", "/painel"],
      ["Clientes em risco", "/clientes-em-risco"],
      ["Contratos e avisos", "/contratos"],
      ["Clientes", "/clientes"],
      ["Triagem de documentos", "/triagem"],
      ["Pedidos", "/pedidos"],
    ],
  },
  {
    role: "FINANCE",
    entries: [
      ["Fila do financeiro", "/financeiro/fila"],
      ["Pedidos", "/pedidos"],
      ["Clientes", "/clientes"],
      ["Painel do comercial", "/painel"],
    ],
  },
  {
    role: "ADMIN",
    entries: [
      ["Usuários", "/usuarios"],
      ["Carga do histórico", "/carga"],
      ["Sincronização com o ERP", "/sincronizacao"],
    ],
  },
];

const allowedPages = roleMenus.flatMap(({ role, entries }) =>
  entries.map(([title = "", path = ""]) => ({ role, title, path })),
);

const pageTitlesByPath = new Map<string, Set<string>>();

for (const { path, title } of allowedPages) {
  pageTitlesByPath.set(
    path,
    (pageTitlesByPath.get(path) ?? new Set()).add(title),
  );
}

const refusedPages = roleMenus.flatMap(({ role, entries }) =>
  [...pageTitlesByPath]
    .filter(([path]) => !entries.some(([, allowed]) => allowed === path))
    .map(([path, titles]) => ({ role, path, titles: [...titles] })),
);

describe("role access", () => {
  beforeEach(() => {
    handleIdentity(unauthorized);
  });

  it.each(roleMenus)(
    "shows the $role menu in order, followed by sign-out",
    async ({ role, entries }) => {
      handleIdentity(() => HttpResponse.json(buildUser(role)));

      renderAt(entries[0]?.[1] ?? "");

      const menu = await screen.findByRole("navigation");
      const items = [...menu.querySelectorAll("a, button")].map((item) => [
        item.textContent,
        item.getAttribute("href"),
      ]);

      expect(items).toStrictEqual([...entries, ["Sair", null]]);
      expect(
        within(menu).getByRole("button", { name: "Sair" }),
      ).toBeInTheDocument();
    },
  );

  it.each(allowedPages)(
    "allows $role to open $path titled $title",
    async ({ role, title, path }) => {
      handleIdentity(() => HttpResponse.json(buildUser(role)));

      const router = renderAt(path);

      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
      expect(
        screen.queryByText("Você não tem acesso a esta página"),
      ).not.toBeInTheDocument();
    },
  );

  it.each(refusedPages)(
    "refuses $path to $role without showing the page",
    async ({ role, path, titles }) => {
      handleIdentity(() => HttpResponse.json(buildUser(role)));

      renderAt(path);

      expect(
        await screen.findByText("Você não tem acesso a esta página"),
      ).toBeInTheDocument();
      for (const title of titles) {
        expect(
          screen.queryByRole("heading", { name: title }),
        ).not.toBeInTheDocument();
      }
    },
  );
});

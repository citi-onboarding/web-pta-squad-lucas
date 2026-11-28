import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { vi } from "vitest";

import { env } from "@/shared/lib/env/env";
import { server } from "@/shared/testing/msw/server";

import { handleSession } from "./router-harness";

export const usersUrl = new URL("api/v1/users", env.VITE_API_URL).toString();
export const erpSellerNamesUrl = new URL(
  "api/v1/users/erp-seller-names",
  env.VITE_API_URL,
).toString();

export function invitationsUrl(userId: string) {
  return new URL(
    `api/v1/users/${userId}/invitations`,
    env.VITE_API_URL,
  ).toString();
}

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: "SELLER" | "MANAGER" | "FINANCE" | "ADMIN";
  erpSellerName: string | null;
  lastLoginAt: string | null;
  status: "ACTIVE" | "INVITED" | "INVITATION_EXPIRED";
  invitationExpiresAt: string | null;
};

// The test time zone is America/Maceio (UTC-3, no daylight saving time).
export const seller: ApiUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ana Souza",
  email: "ana@distrilux.com.br",
  role: "SELLER",
  erpSellerName: "ANA SOUZA ERP",
  lastLoginAt: "2026-11-27T15:30:00Z",
  status: "ACTIVE",
  invitationExpiresAt: null,
};

export const manager: ApiUser = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Marcos Lima",
  email: "marcos@distrilux.com.br",
  role: "MANAGER",
  erpSellerName: null,
  lastLoginAt: null,
  status: "ACTIVE",
  invitationExpiresAt: null,
};

export const invitedFinance: ApiUser = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Fabiana Costa",
  email: "fabiana@distrilux.com.br",
  role: "FINANCE",
  erpSellerName: null,
  lastLoginAt: null,
  status: "INVITED",
  invitationExpiresAt: "2026-11-29T18:00:00Z",
};

export const expiredAdmin: ApiUser = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Dora Alves",
  email: "dora@distrilux.com.br",
  role: "ADMIN",
  erpSellerName: null,
  lastLoginAt: null,
  status: "INVITATION_EXPIRED",
  invitationExpiresAt: null,
};

export const token = "T0kenAbcdefghijklmnopqrstuvwxyz0123456789_-AB";

export function conflict(conflictField: string) {
  return HttpResponse.json(
    {
      title: "Conflict",
      detail: "SERVER DETAIL",
      status: 409,
      conflictField,
    },
    { status: 409 },
  );
}

export const messages = {
  loadFailure: "Não foi possível carregar os usuários.",
  noErpSeller:
    "Nenhum vendedor do ERP disponível. Aguarde a próxima sincronização.",
  emailConflict: "Este e-mail já está cadastrado.",
  erpConflict: "Este vendedor do ERP já está ligado a outro usuário.",
  copied: "Link copiado.",
  copyRefused: "Não foi possível copiar. Selecione o link e copie manualmente.",
};

export function expectedLink() {
  return `${window.location.origin}/criar-senha#${token}`;
}

export function signInAsAdmin() {
  return handleSession("ADMIN");
}

// Simulates the user endpoints over a mutable list, the way the server would.
export function handleUserApi(
  initialUsers: ApiUser[],
  options: { erpSellerNames?: string[] } = {},
) {
  const state = {
    users: initialUsers.map((user) => ({ ...user })),
    registrations: [] as unknown[],
    invitationRequests: [] as string[],
    listRequests: 0,
  };
  const names = options.erpSellerNames ?? ["Ana Souza", "Bruno Lima"];

  server.use(
    http.get(usersUrl, () => {
      state.listRequests += 1;

      return HttpResponse.json(state.users);
    }),
    http.get(erpSellerNamesUrl, () => HttpResponse.json(names)),
    http.post(usersUrl, async ({ request }) => {
      const body = (await request.json()) as Record<string, string>;

      state.registrations.push(body);

      const created: ApiUser = {
        id: "55555555-5555-4555-8555-555555555555",
        name: body.name ?? "",
        email: body.email ?? "",
        role: (body.role ?? "MANAGER") as ApiUser["role"],
        erpSellerName: body.erpSellerName ?? null,
        lastLoginAt: null,
        status: "INVITED",
        invitationExpiresAt: "2026-11-30T15:30:00Z",
      };

      state.users.push(created);

      return HttpResponse.json(
        {
          user: created,
          invitation: { token, expiresAt: "2026-11-30T15:30:00Z" },
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }),
    http.post(
      new URL("api/v1/users/:userId/invitations", env.VITE_API_URL).toString(),
      ({ params }) => {
        const userId = String(params.userId);

        state.invitationRequests.push(userId);

        const target = state.users.find((user) => user.id === userId);

        if (target) {
          target.status = "INVITED";
          target.invitationExpiresAt = "2026-11-30T15:30:00Z";
        }

        return HttpResponse.json(
          { token, expiresAt: "2026-11-30T15:30:00Z" },
          { status: 201, headers: { "Cache-Control": "no-store" } },
        );
      },
    ),
  );

  return state;
}

export function fakeClipboard(writeText: () => Promise<void>) {
  const write = vi.fn(writeText);

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: write },
  });

  return write;
}

export async function openRegistrationDialog() {
  const user = userEvent.setup();

  await user.click(
    await screen.findByRole("button", { name: "+ Cadastrar usuário" }),
  );

  return {
    user,
    dialog: await screen.findByRole("dialog", { name: "Cadastrar usuário" }),
  };
}

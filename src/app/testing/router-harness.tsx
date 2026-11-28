import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect } from "vitest";

import { env } from "@/shared/lib/env/env";
import { createQueryClient } from "@/shared/lib/query/create-query-client";
import { server } from "@/shared/testing/msw/server";

import { routes } from "../router";

export const loginUrl = new URL(
  "api/v1/auth/login",
  env.VITE_API_URL,
).toString();

export const meUrl = new URL("api/v1/auth/me", env.VITE_API_URL).toString();

export const logoutUrl = new URL(
  "api/v1/auth/logout",
  env.VITE_API_URL,
).toString();

export const destinationTitles = [
  "Clientes",
  "Painel do comercial",
  "Fila do financeiro",
  "Usuários",
];

export const failureReasons = {
  invalid:
    "Não foi possível validar os dados. Confira o e-mail e a senha e tente novamente.",
  rateLimited:
    "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.",
  connection:
    "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  server:
    "O servidor não conseguiu responder corretamente. Tente novamente em instantes.",
};

export function problem(status: number) {
  return HttpResponse.json(
    { title: "Server title", detail: "SERVER DETAIL", status },
    { status },
  );
}

export function buildUser(role: string) {
  return {
    id: "3f0c8a52-6d1e-4b7a-9c43-2a5e8f1b7d90",
    name: "Test User",
    email: "user@example.com",
    role,
    erpSellerName: role === "SELLER" ? "TEST SELLER" : null,
  };
}

export function unauthorized() {
  return HttpResponse.json(
    { title: "Unauthorized", status: 401 },
    { status: 401 },
  );
}

export function handleIdentity(respond: () => Response | Promise<Response>) {
  const requests: Request[] = [];

  server.use(
    http.get(meUrl, ({ request }) => {
      requests.push(request.clone());

      return respond();
    }),
  );

  return requests;
}

export function handleSignOut(respond: () => Response) {
  const requests: Request[] = [];

  server.use(
    http.post(logoutUrl, ({ request }) => {
      requests.push(request.clone());

      return respond();
    }),
  );

  return requests;
}

// Simulates a server session that identity checks and sign-out agree on.
export function handleSession(role: string) {
  const session = { active: true };
  const identityRequests = handleIdentity(() =>
    session.active ? HttpResponse.json(buildUser(role)) : unauthorized(),
  );

  return { session, identityRequests };
}

export async function clickSignOut() {
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "Sair" }));
}

export async function expectSignedOut(
  router: ReturnType<typeof createMemoryRouter>,
) {
  expect(
    await screen.findByRole("heading", { name: "Entrar no portal" }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/entrar");
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expectNoInternalContent();
}

export function expectNoInternalContent() {
  for (const title of destinationTitles) {
    expect(
      screen.queryByRole("heading", { name: title }),
    ).not.toBeInTheDocument();
  }
}

export function renderAt(path: string, queryClient = createQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

export function renderSignIn(
  queryClient?: ReturnType<typeof createQueryClient>,
) {
  return renderAt("/entrar", queryClient);
}

export async function submitSignIn(password: string) {
  const user = userEvent.setup();

  await user.type(
    screen.getByRole("textbox", { name: "E-mail" }),
    "user@example.com",
  );
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

function confirmSignOut() {
  return new HttpResponse(null, { status: 204 });
}

// Ends the simulated server session when sign-out is requested.
export function endSessionOnSignOut(
  session: { active: boolean },
  respond: () => Response = confirmSignOut,
) {
  return handleSignOut(() => {
    session.active = false;

    return respond();
  });
}

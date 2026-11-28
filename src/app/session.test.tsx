import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { createQueryClient } from "@/shared/lib/query/create-query-client";

import {
  buildUser,
  unauthorized,
  handleIdentity,
  handleSession,
  expectSignedOut,
  expectNoInternalContent,
  renderAt,
  failureReasons,
  problem,
} from "./testing/router-harness";

describe("session identity", () => {
  beforeEach(() => {
    handleIdentity(unauthorized);
  });

  it("takes an anonymous visitor at the root to sign-in", async () => {
    const router = renderAt("/");

    expect(
      await screen.findByRole("heading", { name: "Entrar no portal" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/entrar");
  });

  it.each(["/clientes", "/painel", "/financeiro/fila", "/usuarios"])(
    "sends an anonymous visitor from %s to sign-in",
    async (path) => {
      const router = renderAt(path);

      expectNoInternalContent();
      expect(
        await screen.findByRole("heading", { name: "Entrar no portal" }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/entrar");
      expectNoInternalContent();
    },
  );

  it("restores the session on an allowed page using the cookie", async () => {
    const requests = handleIdentity(() =>
      HttpResponse.json(buildUser("ADMIN")),
    );

    const router = renderAt("/usuarios");

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(
      await screen.findByRole("heading", { name: "Usuários" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/usuarios");
    expect(requests[0]?.credentials).toBe("include");
    expect(requests[0]?.headers.has("Authorization")).toBe(false);
  });

  it("shows no content or access decision while identity is pending", async () => {
    const requests = handleIdentity(() => new Promise<Response>(() => {}));

    const router = renderAt("/usuarios");

    expectNoInternalContent();
    await waitFor(() => expect(requests).toHaveLength(1));
    expectNoInternalContent();
    expect(
      screen.queryByText("Você não tem acesso a esta página"),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/usuarios");
  });

  it.each([
    {
      failure: "a server error",
      respond: () => new HttpResponse(null, { status: 500 }),
    },
    { failure: "a network error", respond: () => HttpResponse.error() },
    {
      failure: "a body that violates the contract",
      respond: () => HttpResponse.json(buildUser("UNKNOWN")),
    },
  ])(
    "grants no access when identity fails with $failure",
    async ({ respond }) => {
      const requests = handleIdentity(respond);
      const queryClient = createQueryClient();

      renderAt("/usuarios", queryClient);

      expectNoInternalContent();
      await waitFor(() => expect(requests.length).toBeGreaterThan(0));
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
      expectNoInternalContent();
    },
  );

  it.each(["/", "/entrar"])(
    "takes an authenticated user from %s to the role destination",
    async (entry) => {
      handleIdentity(() => HttpResponse.json(buildUser("MANAGER")));

      const router = renderAt(entry);

      expect(
        await screen.findByRole("heading", { name: "Painel do comercial" }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/painel");
    },
  );

  it("returns to sign-in when the session has ended by the next navigation", async () => {
    const { identityRequests } = handleSession("ADMIN");
    const router = renderAt("/usuarios");
    const link = await screen.findByRole("link", {
      name: "Carga do histórico",
    });
    const requestsBefore = identityRequests.length;
    const answer = Promise.withResolvers<Response>();
    const nextRequests = handleIdentity(() => answer.promise);

    await userEvent.setup().click(link);

    expect(identityRequests).toHaveLength(requestsBefore);
    await waitFor(() => expect(nextRequests.length).toBeGreaterThan(0));
    expect(
      screen.queryByRole("heading", { name: "Carga do histórico" }),
    ).not.toBeInTheDocument();

    // Later checks, such as the one on sign-in, see the ended session too.
    handleIdentity(unauthorized);
    await act(async () => {
      answer.resolve(unauthorized());
    });

    await expectSignedOut(router);
  });

  it.each([
    {
      failure: "a 429",
      respond: () => problem(429),
      reason: failureReasons.rateLimited,
    },
    {
      failure: "a 500",
      respond: () => problem(500),
      reason: failureReasons.server,
    },
    {
      failure: "a network error",
      respond: () => HttpResponse.error(),
      reason: failureReasons.connection,
    },
    {
      failure: "an invalid body",
      respond: () => HttpResponse.json(buildUser("UNKNOWN")),
      reason: failureReasons.server,
    },
  ])(
    "explains an identity failure from $failure and retries",
    async ({ respond, reason }) => {
      handleIdentity(respond);
      renderAt("/usuarios");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Não foi possível verificar sua sessão.");
      expect(alert).toHaveTextContent(reason);
      expect(screen.queryByText(/SERVER DETAIL/)).not.toBeInTheDocument();
      expectNoInternalContent();

      handleIdentity(() => HttpResponse.json(buildUser("ADMIN")));
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Tentar novamente" }));

      expect(
        await screen.findByRole("heading", { name: "Usuários" }),
      ).toBeInTheDocument();
    },
  );

  it("explains an identity failure at the root and retries", async () => {
    handleIdentity(() => problem(500));
    const router = renderAt("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível verificar sua sessão.",
    );

    handleIdentity(() => HttpResponse.json(buildUser("MANAGER")));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: "Painel do comercial" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/painel");
  });

  it("keeps only the form when identity fails on the sign-in screen", async () => {
    const requests = handleIdentity(() => problem(500));
    const queryClient = createQueryClient();
    renderAt("/entrar", queryClient);

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(
      screen.getByRole("heading", { name: "Entrar no portal" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

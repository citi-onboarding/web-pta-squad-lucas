import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { createQueryClient } from "@/shared/lib/query/create-query-client";
import { server } from "@/shared/testing/msw/server";

import {
  loginUrl,
  buildUser,
  unauthorized,
  handleIdentity,
  renderSignIn,
  submitSignIn,
  failureReasons,
  problem,
} from "./testing/router-harness";

describe("sign-in", () => {
  beforeEach(() => {
    handleIdentity(unauthorized);
  });

  it("renders the sign-in screen without self-registration", async () => {
    renderSignIn();

    expect(
      await screen.findByRole("heading", { name: "Entrar no portal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Use o e-mail e a senha da DistriLux."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "E-mail" })).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();

    const registrationName = /cadastr|criar (uma )?conta|registr/i;

    expect(
      screen.queryByRole("link", { name: registrationName }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: registrationName }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { role: "SELLER", title: "Clientes", path: "/clientes" },
    { role: "MANAGER", title: "Painel do comercial", path: "/painel" },
    {
      role: "FINANCE",
      title: "Fila do financeiro",
      path: "/financeiro/fila",
    },
    { role: "ADMIN", title: "Usuários", path: "/usuarios" },
  ])(
    "signs in with the cookie session and opens the $role destination",
    async ({ role, title, path }) => {
      const requests: Request[] = [];

      handleIdentity(() =>
        requests.length > 0
          ? HttpResponse.json(buildUser(role))
          : unauthorized(),
      );
      server.use(
        http.post(loginUrl, ({ request }) => {
          requests.push(request.clone());

          return HttpResponse.json({
            user: {
              id: "3f0c8a52-6d1e-4b7a-9c43-2a5e8f1b7d90",
              name: "Test User",
              email: "user@example.com",
              role,
              erpSellerName: role === "SELLER" ? "TEST SELLER" : null,
            },
          });
        }),
      );

      const router = renderSignIn();

      await submitSignIn("test-password");

      await waitFor(() => expect(requests).toHaveLength(1));

      const [request] = requests;

      await expect(request?.json()).resolves.toStrictEqual({
        email: "user@example.com",
        password: "test-password",
        client: "web",
      });
      expect(request?.credentials).toBe("include");
      expect(request?.headers.has("Authorization")).toBe(false);

      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
    },
  );

  it("stays signed in when an earlier anonymous identity answer arrives late", async () => {
    const lateAnswer = Promise.withResolvers<Response>();
    let isFirstIdentityRequest = true;
    const identityRequests = handleIdentity(() => {
      if (isFirstIdentityRequest) {
        isFirstIdentityRequest = false;

        return lateAnswer.promise;
      }

      return HttpResponse.json(buildUser("MANAGER"));
    });
    server.use(
      http.post(loginUrl, () =>
        HttpResponse.json({ user: buildUser("MANAGER") }),
      ),
    );
    const queryClient = createQueryClient();
    const router = renderSignIn(queryClient);

    await waitFor(() => expect(identityRequests).toHaveLength(1));
    await submitSignIn("test-password");
    expect(
      await screen.findByRole("heading", { name: "Painel do comercial" }),
    ).toBeInTheDocument();

    // Give the late answer time to reach the cache and the screen.
    await act(async () => {
      lateAnswer.resolve(unauthorized());
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(router.state.location.pathname).toBe("/painel");
    expect(
      screen.getByRole("heading", { name: "Painel do comercial" }),
    ).toBeInTheDocument();
  });

  it("shows the credentials error and stays on sign-in when unauthorized", async () => {
    server.use(
      http.post(loginUrl, () =>
        HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401 },
        ),
      ),
    );

    const router = renderSignIn();

    await submitSignIn("wrong-password");

    expect(
      await screen.findByText("E-mail ou senha incorretos"),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/entrar");
  });

  it("does not sign in when the success response violates the contract", async () => {
    server.use(
      http.post(loginUrl, () =>
        HttpResponse.json({
          user: {
            id: "3f0c8a52-6d1e-4b7a-9c43-2a5e8f1b7d90",
            name: "Test User",
            email: "user@example.com",
            role: "UNKNOWN",
            erpSellerName: null,
          },
        }),
      ),
    );

    const queryClient = createQueryClient();
    const router = renderSignIn(queryClient);

    await submitSignIn("test-password");

    await waitFor(() =>
      expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe(
        "error",
      ),
    );
    expect(router.state.location.pathname).toBe("/entrar");
    expect(
      screen.getByRole("heading", { name: "Entrar no portal" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it.each([
    {
      failure: "a 400",
      respond: () => problem(400),
      reason: failureReasons.invalid,
    },
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
      failure: "an invalid success body",
      respond: () => HttpResponse.json({ user: buildUser("UNKNOWN") }),
      reason: failureReasons.server,
    },
  ])(
    "explains a sign-in failure from $failure",
    async ({ respond, reason }) => {
      server.use(http.post(loginUrl, respond));
      const router = renderSignIn();

      await submitSignIn("test-password");

      expect(await screen.findByRole("alert")).toHaveTextContent(reason);
      expect(screen.queryByText(/SERVER DETAIL/)).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/entrar");
    },
  );

  it.each([
    { fields: "both fields empty", email: "", password: "" },
    { fields: "an empty email", email: "", password: "test-password" },
    { fields: "an empty password", email: "user@example.com", password: "" },
    { fields: "a malformed email", email: "user", password: "test-password" },
  ])("does not submit $fields", async ({ email, password }) => {
    let requestCount = 0;
    server.use(
      http.post(loginUrl, () => {
        requestCount += 1;

        return unauthorized();
      }),
    );
    renderSignIn();
    const user = userEvent.setup();
    const emailField = screen.getByRole("textbox", { name: "E-mail" });
    const passwordField = screen.getByLabelText("Senha");

    if (email) await user.type(emailField, email);
    if (password) await user.type(passwordField, password);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

    expect(requestCount).toBe(0);
    expect(emailField).toBeRequired();
    expect(passwordField).toBeRequired();
  });

  it("disables the button and clears the failure while sign-in is pending", async () => {
    server.use(http.post(loginUrl, () => problem(500), { once: true }));
    renderSignIn();
    await submitSignIn("test-password");
    // Waits for the first attempt to finish before the pending one starts.
    await screen.findByRole("alert");

    server.use(http.post(loginUrl, () => new Promise<Response>(() => {})));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByRole("button", { name: "Entrando…" }),
    ).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

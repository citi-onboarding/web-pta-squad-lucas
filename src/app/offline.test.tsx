import { onlineManager } from "@tanstack/react-query";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { server } from "@/shared/testing/msw/server";

import {
  buildUser,
  clickSignOut,
  expectNoInternalContent,
  failureReasons,
  handleIdentity,
  handleSession,
  handleSignOut,
  loginUrl,
  renderAt,
  renderSignIn,
  submitSignIn,
  unauthorized,
} from "./testing/router-harness";

// What a browser does when the connection drops: it announces it.
function goOffline() {
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

describe("offline browser", () => {
  // The online state is global, so it must not leak into other tests.
  afterEach(() => onlineManager.setOnline(true));

  it("explains that sign-in has no connection", async () => {
    handleIdentity(unauthorized);
    server.use(http.post(loginUrl, () => HttpResponse.error()));
    renderSignIn();
    await screen.findByRole("heading", { name: "Entrar no portal" });

    goOffline();
    await submitSignIn("test-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      failureReasons.connection,
    );
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("explains that the identity check has no connection and retries", async () => {
    handleIdentity(() => HttpResponse.json(buildUser("ADMIN")));
    renderAt("/usuarios");
    const link = await screen.findByRole("link", {
      name: "Carga do histórico",
    });

    handleIdentity(() => HttpResponse.error());
    goOffline();
    await userEvent.setup().click(link);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível verificar sua sessão.");
    expect(alert).toHaveTextContent(failureReasons.connection);
    expectNoInternalContent();

    handleIdentity(() => HttpResponse.json(buildUser("ADMIN")));
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: "Carga do histórico" }),
    ).toBeInTheDocument();
  });

  it("explains that sign-out has no connection", async () => {
    handleSession("ADMIN");
    handleSignOut(() => HttpResponse.error());
    renderAt("/usuarios");
    await screen.findByRole("button", { name: "Sair" });

    goOffline();
    await clickSignOut();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Não foi possível sair. Você continua conectado.",
    );
    expect(alert).toHaveTextContent(failureReasons.connection);
    expect(
      screen.getByRole("heading", { name: "Usuários" }),
    ).toBeInTheDocument();
  });
});

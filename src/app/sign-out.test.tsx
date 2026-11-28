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
  handleSignOut,
  handleSession,
  clickSignOut,
  expectSignedOut,
  expectNoInternalContent,
  renderAt,
  renderSignIn,
  submitSignIn,
  endSessionOnSignOut,
  failureReasons,
  problem,
} from "./testing/router-harness";

describe("sign-out", () => {
  beforeEach(() => {
    handleIdentity(unauthorized);
  });

  it.each([
    {
      answer: "confirms",
      respond: () => new HttpResponse(null, { status: 204 }),
    },
    { answer: "reports an ended session", respond: unauthorized },
  ])("signs out when the server $answer", async ({ respond }) => {
    const { session } = handleSession("ADMIN");
    const signOutRequests = endSessionOnSignOut(session, respond);
    const router = renderAt("/usuarios");

    await clickSignOut();

    await expectSignedOut(router);
    expect(signOutRequests).toHaveLength(1);
  });
  it.each([
    {
      failure: "a server error",
      respond: () => new HttpResponse(null, { status: 500 }),
    },
    { failure: "a network error", respond: () => HttpResponse.error() },
  ])(
    "stays signed in when sign-out fails with $failure",
    async ({ respond }) => {
      handleSession("ADMIN");
      const signOutRequests = handleSignOut(respond);
      const queryClient = createQueryClient();
      const router = renderAt("/usuarios", queryClient);

      await clickSignOut();

      await waitFor(() => expect(signOutRequests).toHaveLength(1));
      await waitFor(() => expect(queryClient.isMutating()).toBe(0));
      expect(router.state.location.pathname).toBe("/usuarios");
      expect(
        screen.getByRole("heading", { name: "Usuários" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Entrar no portal" }),
      ).not.toBeInTheDocument();
    },
  );
  it("keeps internal pages protected when going back after sign-out", async () => {
    const { session } = handleSession("ADMIN");
    endSessionOnSignOut(session);
    const router = renderAt("/usuarios");

    await userEvent
      .setup()
      .click(await screen.findByRole("link", { name: "Carga do histórico" }));
    await screen.findByRole("heading", { name: "Carga do histórico" });
    await clickSignOut();
    await expectSignedOut(router);

    await act(() => router.navigate(-1));

    expectNoInternalContent();
    await expectSignedOut(router);
  });
  it("discards cached user data on sign-out", async () => {
    const { session } = handleSession("ADMIN");
    endSessionOnSignOut(session);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["cached-user-data"], ["private record"]);
    const router = renderAt("/usuarios", queryClient);

    await clickSignOut();

    await expectSignedOut(router);
    expect(queryClient.getQueryData(["cached-user-data"])).toBeUndefined();
  });
  it("is not restored by a late identity answer after sign-out", async () => {
    const lateAnswer = Promise.withResolvers<Response>();
    let identityResponse: () => Response | Promise<Response> = () =>
      HttpResponse.json(buildUser("ADMIN"));
    const identityRequests = handleIdentity(() => identityResponse());
    handleSignOut(() => {
      identityResponse = unauthorized;

      return new HttpResponse(null, { status: 204 });
    });
    const queryClient = createQueryClient();
    const router = renderAt("/usuarios", queryClient);

    await screen.findByRole("button", { name: "Sair" });
    const requestsBefore = identityRequests.length;
    identityResponse = () => lateAnswer.promise;
    act(() => void queryClient.invalidateQueries());
    await waitFor(() =>
      expect(identityRequests).toHaveLength(requestsBefore + 1),
    );

    await clickSignOut();
    await expectSignedOut(router);

    await act(async () => {
      lateAnswer.resolve(HttpResponse.json(buildUser("ADMIN")));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    await expectSignedOut(router);
  });
  it("uses only the session cookie and stores no credential", async () => {
    let isSignedIn = false;
    const identityRequests = handleIdentity(() =>
      isSignedIn ? HttpResponse.json(buildUser("ADMIN")) : unauthorized(),
    );
    const signInRequests: Request[] = [];
    server.use(
      http.post(loginUrl, ({ request }) => {
        signInRequests.push(request.clone());
        isSignedIn = true;

        return HttpResponse.json({ user: buildUser("ADMIN") });
      }),
    );
    const signOutRequests = handleSignOut(() => {
      isSignedIn = false;

      return new HttpResponse(null, { status: 204 });
    });
    const expectNothingStored = () => {
      expect(window.localStorage).toHaveLength(0);
      expect(window.sessionStorage).toHaveLength(0);
      expect(document.cookie).toBe("");
    };
    const router = renderSignIn();

    await submitSignIn("test-password");
    await screen.findByRole("heading", { name: "Usuários" });
    expectNothingStored();
    await clickSignOut();
    await expectSignedOut(router);
    expectNothingStored();

    expect(signInRequests).toHaveLength(1);
    expect(signOutRequests).toHaveLength(1);
    expect(identityRequests.length).toBeGreaterThan(0);
    for (const request of [
      ...signInRequests,
      ...identityRequests,
      ...signOutRequests,
    ]) {
      expect(request.credentials).toBe("include");
      expect(request.headers.has("Authorization")).toBe(false);
    }
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
  ])(
    "explains a sign-out failure from $failure",
    async ({ respond, reason }) => {
      handleSession("ADMIN");
      handleSignOut(respond);
      renderAt("/usuarios");

      await clickSignOut();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Não foi possível sair. Você continua conectado.",
      );
      expect(alert).toHaveTextContent(reason);
      expect(screen.queryByText(/SERVER DETAIL/)).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Usuários" }),
      ).toBeInTheDocument();
    },
  );
});

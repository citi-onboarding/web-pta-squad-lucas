import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { env } from "@/shared/lib/env/env";
import { server } from "@/shared/testing/msw/server";

import { AppProviders } from "./providers";

describe("AppProviders", () => {
  it("composes routing and server-state providers", async () => {
    server.use(
      http.get(new URL("api/v1/auth/me", env.VITE_API_URL).toString(), () =>
        HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401 },
        ),
      ),
    );

    render(<AppProviders />);

    expect(
      await screen.findByRole("heading", { name: "Entrar no portal" }),
    ).toBeInTheDocument();
  });
});

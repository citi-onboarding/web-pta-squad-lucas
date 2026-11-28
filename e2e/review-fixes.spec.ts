import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const token = "T0kenAbcdefghijklmnopqrstuvwxyz0123456789_-AB";
const unusableMessage =
  "Este link de convite não vale mais. Ele pode ter vencido ou já ter sido usado. Peça um novo link ao administrador.";

const invitedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Fabiana Costa",
  email: "fabiana@distrilux.com.br",
  role: "FINANCE",
  erpSellerName: null,
  lastLoginAt: null,
  status: "INVITED",
  invitationExpiresAt: "2026-11-29T18:00:00Z",
};

function corsHeaders(page: Page) {
  return {
    "access-control-allow-origin": new URL(page.url()).origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}

// Simulated API: these tests prove nothing about cookies, CORS or the backend.
// Submissions answer only after `release` is called.
async function mockAdminApi(page: Page) {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const submissions: string[] = [];
  const invitation = { token, expiresAt: "2026-11-30T15:30:00Z" };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const headers = corsHeaders(page);

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else if (url.endsWith("/auth/me")) {
      await route.fulfill({
        status: 200,
        headers,
        json: {
          id: "3f0c8a52-6d1e-4b7a-9c43-2a5e8f1b7d90",
          name: "Test Admin",
          email: "admin@example.com",
          role: "ADMIN",
          erpSellerName: null,
        },
      });
    } else if (request.method() === "POST") {
      submissions.push(url);
      await gate;
      await route.fulfill({
        status: 201,
        headers,
        json: url.endsWith("/invitations")
          ? invitation
          : { user: { ...invitedUser, role: "MANAGER" }, invitation },
      });
    } else {
      await route.fulfill({
        status: 200,
        headers,
        json: url.endsWith("/erp-seller-names") ? [] : [invitedUser],
      });
    }
  });

  return { release: () => release(), submissions };
}

// Chromium stops honoring a prevented `cancel` event on a repeated Escape
// without new user activation, so the key is pressed more than once.
async function pressEscapeRepeatedly(page: Page) {
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("Escape");
  }
}

test("Escape does not close the dialog while a registration is pending", async ({
  page,
}) => {
  const api = await mockAdminApi(page);

  await page.goto("/usuarios");
  await page.getByRole("button", { name: "+ Cadastrar usuário" }).click();

  const dialog = page.getByRole("dialog", { name: "Cadastrar usuário" });

  await dialog.getByLabel("Nome").fill("Nova Pessoa");
  await dialog.getByLabel("E-mail").fill("nova@distrilux.com.br");
  await dialog.getByLabel("Papel").selectOption({ label: "Gerente" });
  await dialog.getByRole("button", { name: "Cadastrar" }).click();
  await expect.poll(() => api.submissions.length).toBe(1);

  await pressEscapeRepeatedly(page);

  await expect(dialog).toBeVisible();

  api.release();

  await expect(
    page.getByRole("textbox", { name: "Link de convite" }),
  ).toHaveValue(new RegExp(`/criar-senha#${token}$`));
});

test("Escape does not close the dialog while a new invitation is pending", async ({
  page,
}) => {
  const api = await mockAdminApi(page);

  await page.goto("/usuarios");
  await page
    .getByRole("row", { name: /Fabiana Costa/ })
    .getByRole("button", { name: "Gerar novo link" })
    .click();

  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: "Gerar novo link" }).click();
  await expect.poll(() => api.submissions.length).toBe(1);

  await pressEscapeRepeatedly(page);

  await expect(dialog).toBeVisible();

  api.release();

  await expect(
    page.getByRole("textbox", { name: "Link de convite" }),
  ).toHaveValue(new RegExp(`/criar-senha#${token}$`));
});

test("another link in the same tab is checked and its fragment removed", async ({
  page,
}) => {
  const lookups: unknown[] = [];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const headers = corsHeaders(page);

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else if (request.url().endsWith("/invitations/lookup")) {
      const body = request.postDataJSON() as { token: string };

      lookups.push(body);
      await route.fulfill(
        body.token === token
          ? {
              status: 200,
              headers,
              json: {
                name: "Nova Pessoa",
                email: "nova@distrilux.com.br",
                expiresAt: "2026-11-30T15:30:00Z",
              },
            }
          : { status: 404, headers, json: { status: 404 } },
      );
    } else {
      await route.fulfill({ status: 401, headers, json: { status: 401 } });
    }
  });

  await page.goto("/criar-senha#used-token");
  await expect(page.getByText(unusableMessage)).toBeVisible();
  await page.evaluate(() => {
    document.body.dataset.sameDocument = "yes";
  });

  await page.goto(`/criar-senha#${token}`);

  await expect(
    page.getByText(
      "Olá, Nova Pessoa. Crie a senha para entrar com nova@distrilux.com.br.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/criar-senha$/);
  // The page was not reloaded: only the fragment changed.
  await expect(page.locator("body")).toHaveAttribute(
    "data-same-document",
    "yes",
  );
  expect(lookups).toEqual([{ token: "used-token" }, { token }]);
});

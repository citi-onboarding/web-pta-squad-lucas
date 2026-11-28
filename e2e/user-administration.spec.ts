import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

const users = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ana Souza de Albuquerque Cavalcanti",
    email: "ana.souza.albuquerque.cavalcanti@distrilux.com.br",
    role: "SELLER",
    erpSellerName: "ANA SOUZA DE ALBUQUERQUE CAVALCANTI",
    lastLoginAt: "2026-11-27T15:30:00Z",
    status: "ACTIVE",
    invitationExpiresAt: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Fabiana Costa",
    email: "fabiana@distrilux.com.br",
    role: "FINANCE",
    erpSellerName: null,
    lastLoginAt: null,
    status: "INVITED",
    invitationExpiresAt: "2026-11-29T18:00:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Dora Alves",
    email: "dora@distrilux.com.br",
    role: "ADMIN",
    erpSellerName: null,
    lastLoginAt: null,
    status: "INVITATION_EXPIRED",
    invitationExpiresAt: null,
  },
];

// Simulated API: these tests prove nothing about cookies, CORS or the backend.
async function mockApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const headers = {
      "access-control-allow-origin": new URL(page.url()).origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
    };

    if (url.endsWith("/auth/me")) {
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

      return;
    }

    await route.fulfill({
      status: url.endsWith("/api/v1/users") ? 200 : 404,
      headers,
      json: url.endsWith("/api/v1/users") ? users : { status: 404 },
    });
  });
}

async function expectDialogToFit(page: Page) {
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();

  const overflow = await dialog.evaluate((element) => {
    const { left, right } = element.getBoundingClientRect();

    return {
      page:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      dialog: element.scrollWidth - element.clientWidth,
      outsideViewport: left < 0 || right > document.documentElement.clientWidth,
    };
  });

  expect(overflow).toEqual({ page: 0, dialog: 0, outsideViewport: false });

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(violations).toEqual([]);
}

// Registered after mockApi, so it takes precedence for these requests only.
async function mockDialogApi(page: Page) {
  const invitation = {
    token: "T0kenAbcdefghijklmnopqrstuvwxyz0123456789_-AB",
    expiresAt: "2026-11-30T18:00:00Z",
  };

  await page.route(
    /\/api\/v1\/users(\/erp-seller-names|\/[^/]+\/invitations)?$/,
    async (route) => {
      const request = route.request();
      const headers = {
        "access-control-allow-origin": new URL(page.url()).origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET, POST, OPTIONS",
      };

      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
      } else if (request.url().endsWith("/erp-seller-names")) {
        await route.fulfill({
          status: 200,
          headers,
          json: ["ANA SOUZA DE ALBUQUERQUE CAVALCANTI DOS SANTOS FILHO"],
        });
      } else if (request.url().endsWith("/invitations")) {
        await route.fulfill({ status: 201, headers, json: invitation });
      } else if (request.method() === "POST") {
        await route.fulfill({
          status: 201,
          headers,
          json: { user: users[1], invitation },
        });
      } else {
        await route.fulfill({ status: 200, headers, json: users });
      }
    },
  );
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} dialogs`, () => {
    test.use({ colorScheme });

    test("registration, link and new link dialogs fit and are accessible", async ({
      page,
    }) => {
      await mockApi(page);
      await mockDialogApi(page);
      await page.goto("/usuarios");

      await page.getByRole("button", { name: "+ Cadastrar usuário" }).click();
      await page.getByLabel("Nome").fill(users[0]!.name);
      await page.getByLabel("E-mail").fill(users[0]!.email);
      await page.getByLabel("Papel").selectOption({ label: "Vendedor" });
      await page.getByLabel(/Vendedor no ERP/).selectOption({ index: 1 });
      await expectDialogToFit(page);

      await page
        .getByRole("button", { name: "Cadastrar", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Copiar link" }),
      ).toBeVisible();
      await expectDialogToFit(page);

      await page.getByRole("button", { name: "Fechar" }).click();
      await page
        .getByRole("button", { name: "Gerar novo link" })
        .first()
        .click();
      await expectDialogToFit(page);
    });
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} color scheme`, () => {
    test.use({ colorScheme });

    test("user list fits a narrow viewport, labels each value and is accessible", async ({
      page,
    }) => {
      await mockApi(page);
      await page.goto("/usuarios");

      const row = page.getByRole("row", { name: /Fabiana Costa/ });

      await expect(row).toBeVisible();

      for (const label of [
        "Nome",
        "E-mail",
        "Papel",
        "Vendedor no ERP",
        "Último acesso",
      ]) {
        await expect(row.getByText(label, { exact: true })).toBeVisible();
      }

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(violations).toEqual([]);
    });
  });
}

test.describe("wide viewport", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("keeps every value aligned with its column header", async ({ page }) => {
    await mockApi(page);
    await page.goto("/usuarios");

    const table = page.getByRole("table", { name: "Lista de usuários" });

    await expect(table.getByRole("row", { name: /Dora Alves/ })).toBeVisible();

    const leftEdges = (elements: Element[]) =>
      elements.map((element) =>
        Math.round(element.getBoundingClientRect().left),
      );
    const headers = await table
      .getByRole("columnheader")
      .evaluateAll(leftEdges);

    for (const { name } of users) {
      const cells = await table
        .getByRole("row", { name: new RegExp(name) })
        .getByRole("cell")
        .evaluateAll(leftEdges);

      expect(cells, name).toEqual(headers);
    }
  });
});

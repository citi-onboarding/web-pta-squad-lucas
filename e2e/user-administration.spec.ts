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

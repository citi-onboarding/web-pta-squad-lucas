import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const viewportWidth = 390;
const serverReason =
  "O servidor não conseguiu responder corretamente. Tente novamente em instantes.";

test.use({ viewport: { width: viewportWidth, height: 844 } });

const roles = [
  {
    role: "SELLER",
    path: "/clientes",
    entries: [
      "Clientes",
      "Clientes em risco",
      "Triagem de documentos",
      "Meus pedidos",
    ],
  },
  {
    role: "MANAGER",
    path: "/painel",
    entries: [
      "Painel do comercial",
      "Clientes em risco",
      "Contratos e avisos",
      "Clientes",
      "Triagem de documentos",
      "Pedidos",
    ],
  },
  {
    role: "FINANCE",
    path: "/financeiro/fila",
    entries: [
      "Fila do financeiro",
      "Pedidos",
      "Clientes",
      "Painel do comercial",
    ],
  },
  {
    role: "ADMIN",
    path: "/usuarios",
    entries: ["Usuários", "Carga do histórico", "Sincronização com o ERP"],
  },
];

// Simulated API: these tests prove nothing about cookies, CORS or the backend.
async function mockApi(
  page: Page,
  signedInRole: string | null,
  failingPath?: "/me" | "/logout",
) {
  await page.route("**/api/v1/auth/**", async (route) => {
    const url = route.request().url();
    const isIdentity = url.endsWith("/me");
    const body =
      isIdentity && signedInRole
        ? {
            id: "3f0c8a52-6d1e-4b7a-9c43-2a5e8f1b7d90",
            name: "Test User",
            email: "user@example.com",
            role: signedInRole,
            erpSellerName: signedInRole === "SELLER" ? "TEST SELLER" : null,
          }
        : { title: "Unauthorized", status: 401 };

    const succeededStatus = isIdentity && signedInRole ? 200 : 401;

    await route.fulfill({
      status: failingPath && url.endsWith(failingPath) ? 500 : succeededStatus,
      headers: {
        "access-control-allow-origin": new URL(page.url()).origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type",
      },
      json: body,
    });
  });
}

async function expectWithinViewport(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(violations).toEqual([]);
}

async function expectMenu(page: Page, entries: string[]) {
  const menu = page.getByRole("navigation");

  for (const name of entries) {
    await expectWithinViewport(menu.getByRole("link", { name, exact: true }));
  }

  await expectWithinViewport(menu.getByRole("button", { name: "Sair" }));
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} color scheme`, () => {
    test.use({ colorScheme });

    test("sign-in and rejected credentials fit and are accessible", async ({
      page,
    }) => {
      await mockApi(page, null);
      await page.goto("/entrar");

      const email = page.getByRole("textbox", { name: "E-mail" });
      const password = page.getByLabel("Senha");
      const submit = page.getByRole("button", { name: "Entrar" });

      for (const control of [email, password, submit]) {
        await expectWithinViewport(control);
      }

      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);

      await email.fill("user@example.com");
      await password.fill("wrong-password");
      await submit.click();

      await expect(page.getByRole("alert")).toHaveText(
        "E-mail ou senha incorretos",
      );
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });

    for (const { role, path, entries } of roles) {
      test(`${role} menu and destination fit and are accessible`, async ({
        page,
      }) => {
        await mockApi(page, role);
        await page.goto(path);

        await expect(
          page.getByRole("heading", { level: 1, name: entries[0] }),
        ).toBeVisible();
        await expectMenu(page, entries);
        await expectNoHorizontalScroll(page);
        await expectNoAccessibilityViolations(page);
      });
    }

    test("refusal keeps the menu, fits and is accessible", async ({ page }) => {
      await mockApi(page, "SELLER");
      await page.goto("/usuarios");

      await expect(
        page.getByText("Você não tem acesso a esta página"),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Usuários" })).toHaveCount(
        0,
      );
      await expectMenu(page, roles[0]!.entries);
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });

    test("identity failure and retry fit and are accessible", async ({
      page,
    }) => {
      await mockApi(page, "ADMIN", "/me");
      await page.goto("/usuarios");

      await expect(page.getByRole("alert")).toContainText(
        "Não foi possível verificar sua sessão.",
      );
      await expect(page.getByRole("alert")).toContainText(serverReason);
      await expectWithinViewport(
        page.getByRole("button", { name: "Tentar novamente" }),
      );
      await expect(page.getByRole("heading", { name: "Usuários" })).toHaveCount(
        0,
      );
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });

    test("sign-out failure keeps the menu, fits and is accessible", async ({
      page,
    }) => {
      await mockApi(page, "MANAGER", "/logout");
      await page.goto("/painel");
      await page.getByRole("button", { name: "Sair" }).click();

      await expect(page.getByRole("alert")).toContainText(
        "Não foi possível sair. Você continua conectado.",
      );
      await expect(page.getByRole("alert")).toContainText(serverReason);
      await expectWithinViewport(page.getByRole("alert"));
      await expectMenu(page, roles[1]!.entries);
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });
  });
}

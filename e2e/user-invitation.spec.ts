import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

const token = "T0kenAbcdefghijklmnopqrstuvwxyz0123456789_-AB";
const email = "nova.pessoa.com.nome.bem.longo@distrilux.com.br";
const notice = "Senha criada. Entre com seu e-mail e senha.";

// Simulated API: these tests prove nothing about cookies, CORS or the backend.
async function mockApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const headers = {
      "access-control-allow-origin": new URL(page.url()).origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else if (url.endsWith("/invitations/lookup")) {
      await route.fulfill({
        status: 200,
        headers,
        json: {
          name: "Nova Pessoa",
          email,
          expiresAt: "2026-11-30T15:30:00Z",
        },
      });
    } else if (url.endsWith("/invitations/accept")) {
      await route.fulfill({ status: 204, headers });
    } else {
      await route.fulfill({
        status: 401,
        headers,
        json: { title: "Unauthorized", status: 401 },
      });
    }
  });
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

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} color scheme`, () => {
    test.use({ colorScheme });

    test("invitation form fits a narrow viewport and is accessible", async ({
      page,
    }) => {
      await mockApi(page);
      await page.goto(`/criar-senha#${token}`);

      await expect(
        page.getByRole("heading", { name: "Criar senha" }),
      ).toBeVisible();
      await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Confirmar senha")).toBeVisible();
      await expect(page).toHaveURL(/\/criar-senha$/);
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });

    test("unusable link fits and is accessible", async ({ page }) => {
      await mockApi(page);
      await page.goto("/criar-senha");

      await expect(
        page.getByText(
          "Este link de convite não vale mais. Ele pode ter vencido ou já ter sido usado. Peça um novo link ao administrador.",
        ),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);
    });

    test("flow from the link to sign-in shows the notice once", async ({
      page,
    }) => {
      await mockApi(page);
      await page.goto(`/criar-senha#${token}`);

      await page.getByLabel("Senha", { exact: true }).fill("senha-segura-123");
      await page.getByLabel("Confirmar senha").fill("senha-segura-123");
      await page.getByRole("button", { name: "Criar senha" }).click();

      await expect(page).toHaveURL(/\/entrar$/);
      await expect(page.getByText(notice)).toBeVisible();
      await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue(
        email,
      );
      await expect(page.getByLabel("Senha")).toHaveValue("");
      await expectNoHorizontalScroll(page);
      await expectNoAccessibilityViolations(page);

      await page.reload();

      await expect(
        page.getByRole("heading", { name: "Entrar no portal" }),
      ).toBeVisible();
      await expect(page.getByText(notice)).toHaveCount(0);
      await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue(
        "",
      );
    });
  });
}

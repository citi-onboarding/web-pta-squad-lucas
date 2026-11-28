import { expect, test } from "@playwright/test";

test("serves the not-found route through the SPA fallback", async ({
  page,
}) => {
  await page.goto("/missing-route");

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("reports static asset health", async ({ request }) => {
  const response = await request.get("/health.json");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    scope: "static-assets",
  });
});

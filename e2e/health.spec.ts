import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
  });
});

test("health page creates a menstrual day and switches tabs", async ({
  page,
  request,
}) => {
  const probe = await request.get("/api/v1/menstrual-days/");
  test.skip(
    probe.status() === 404,
    "health endpoints are not available in the pinned lifeos-cli backend",
  );

  await page.goto("/health");
  await expect(page).toHaveTitle(/Health/);

  await expect(
    page.getByRole("link", { name: "Health", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add day" })).toBeVisible();
  await page.getByRole("button", { name: "Add day" }).first().click();
  await page.getByRole("checkbox", { name: "In period" }).check();
  await page.getByRole("button", { name: "Add day" }).last().click();

  await expect(page.getByText("Menstrual day created")).toBeVisible();
  await expect(page.getByText(/In period/).first()).toBeVisible();

  await page.getByRole("button", { name: "Body" }).click();
  await expect(
    page.getByRole("button", { name: "Add measurement" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sleep" }).click();
  await expect(page.getByRole("button", { name: "Add sleep" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
  });
});

test("navigation exposes the LifeOS modules and routes to the timelog page", async ({
  page,
}) => {
  await page.goto("/");

  for (const moduleName of [
    "Vision",
    "Habit",
    "Planning",
    "Timelog",
    "Finance",
    "Stats",
    "Schedule",
    "Note",
    "People",
    "Config",
  ]) {
    await expect(
      page.getByRole("link", { name: moduleName, exact: true }),
    ).toBeVisible();
  }

  await page.getByRole("link", { name: "Timelog", exact: true }).click();
  await expect(page).toHaveURL(/\/timelog$/);
  await expect(page).toHaveTitle(/Timelog/);
});

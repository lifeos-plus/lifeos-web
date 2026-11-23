import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
  });
});

test("settings keeps height input usable and separates areas from visions", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "Appearance", exact: true }),
  ).toBeVisible();

  // The old height input was disabled after the first keystroke (it committed
  // and saved on every key), so it could never accept a multi-digit value.
  await page.getByRole("button", { name: "Health", exact: true }).click();
  const height = page.getByLabel("Body height");
  await expect(height).toBeEnabled();
  await height.click();
  await height.press("ControlOrMeta+A");
  await height.pressSequentially("175");

  expect(await height.inputValue()).toBe("175");

  // The client must submit the complete multi-digit value, not a partial one.
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/preferences/health.body_height_cm"),
  );
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const savedRequest = (await saved).request();
  expect(savedRequest.postDataJSON()).toMatchObject({ value: 175 });

  await expect(
    page.getByRole("button", { name: "Data Settings", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Areas", exact: true }).click();
  await expect(page.getByText("Area Order", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Visions", exact: true }).click();
  await expect(page.getByLabel("Select Default Vision")).toBeVisible();
});

test("settings persists body height across reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Health", exact: true }).click();
  const height = page.getByLabel("Body height");
  await expect(height).toBeEnabled();
  await height.click();
  await height.press("ControlOrMeta+A");
  await height.pressSequentially("175");

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/preferences/health.body_height_cm"),
  );
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const response = await saved;
  expect(await response.json()).toMatchObject({ value: 175 });

  await page.reload();
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await expect(page.getByLabel("Body height")).toHaveValue("175");
});

test("settings persists the interface font across reload", async ({ page }) => {
  await page.goto("/settings");
  const font = page.getByLabel("Interface Font");
  await expect(font).toBeVisible();
  await font.click();

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/preferences/appearance.font"),
  );
  await page.getByRole("button", { name: "Serif", exact: true }).click();

  const response = await saved;
  expect(await response.json()).toMatchObject({ value: "serif" });

  await page.reload();
  await expect(page.getByLabel("Interface Font")).toHaveValue("Serif");
});

import { expect, test } from "@playwright/test";

import { resolveSchemaVersion } from "../scripts/pinned-cli-version.mjs";

const HEALTH_PERSISTENCE_MIN_VERSION = [1, 4, 10] as const;

function supportsHealthPreferencePersistence(version: string): boolean {
  const [major = 0, minor = 0, patch = 0] = version
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  if (![major, minor, patch].every(Number.isFinite)) {
    return true;
  }
  const [minMajor, minMinor, minPatch] = HEALTH_PERSISTENCE_MIN_VERSION;
  return (
    major > minMajor ||
    (major === minMajor &&
      (minor > minMinor || (minor === minMinor && patch >= minPatch)))
  );
}

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

  // NOTE: lifeos-cli 1.4.9 drops health.body_height_cm on write
  // (lifeos-plus/lifeos-cli#372), so asserting persistence across a reload
  // would fail until the pinned API ships that fix. This asserts that the
  // client accepts and submits the complete multi-digit value.
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

test("settings persists body height when the pinned API supports it", async ({
  page,
}) => {
  const pinnedVersion = resolveSchemaVersion();
  test.skip(
    !supportsHealthPreferencePersistence(pinnedVersion),
    `Pinned lifeos-cli ${pinnedVersion} cannot persist health preferences yet (lifeos-plus/lifeos-cli#372)`,
  );

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

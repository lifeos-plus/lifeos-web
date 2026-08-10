import { expect, test } from "@playwright/test";

/**
 * Core user loop E2E coverage:
 *   create a vision -> plan a task for today -> record a linked timelog ->
 *   verify the timelog shows up in the Insights statistics.
 *
 * The suite runs against a real LifeOS Web API backed by a throwaway SQLite
 * database (scripts/e2e/start-api.sh), so selectors stay on role/label/text
 * and never depend on generated class names.
 */

const runId = Date.now().toString(36);
const visionName = `E2E Vision ${runId}`;
const taskContent = `E2E Task ${runId}`;
const timelogTitle = `E2E Timelog ${runId}`;
const areaName = `E2E Area ${runId}`;

test.beforeEach(async ({ page }) => {
  // Force the English catalog so assertions are stable across environments.
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
  });
});

test("core loop: create vision, plan task, record timelog, inspect insights", async ({
  page,
}) => {
  // 1. Create a vision through the UI (empty state must expose the modal).
  await page.goto("/visions");
  await page.getByRole("button", { name: "Create New" }).click();
  const createVisionDialog = page.getByRole("dialog");
  await expect(createVisionDialog).toBeVisible();
  await page.getByLabel("Vision Name").fill(visionName);
  await createVisionDialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(visionName, { exact: true })).toBeVisible();

  // 2. Seed supporting data through the API: make the new vision the default
  //    inbox vision (enables the planning create-task entry) and create one
  //    area (Insights aggregates timelog minutes by area).
  const visionsResponse = await page.request.get(
    "/api/v1/visions/?status_filter=active&page=1&size=100",
  );
  expect(visionsResponse.ok()).toBeTruthy();
  const vision = (await visionsResponse.json()).items.find(
    (item: { name: string }) => item.name === visionName,
  ) as { id: string };
  expect(vision?.id).toBeTruthy();

  const inboxPreferenceResponse = await page.request.put(
    "/api/v1/preferences/todos.default_inbox_vision",
    { data: { value: vision.id, module: "todos" } },
  );
  expect(inboxPreferenceResponse.ok()).toBeTruthy();

  const areaResponse = await page.request.post("/api/v1/areas/", {
    data: { name: areaName },
  });
  expect(areaResponse.ok()).toBeTruthy();

  // 3. Plan the task for today from the Planning page.
  await page.goto("/planning");
  await page
    .getByRole("button", { name: /Create New Task to/ })
    .click();
  const taskInput = page.locator('input[id^="new-task-content-"]');
  await expect(taskInput).toBeVisible();
  await taskInput.fill(taskContent);
  await page.getByRole("button", { name: "Create Task", exact: true }).click();
  await expect(page.getByText(taskContent, { exact: true })).toBeVisible();

  // 4. Record a one-hour timelog linked to the planned task and the area.
  await page.goto("/timelog");
  const quickAdd = page.getByRole("button", {
    name: "Quick add time entry",
  });
  if (await quickAdd.count()) {
    await quickAdd.first().click();
  }
  await page.locator("#timelog-inline-title").fill(timelogTitle);
  await page.locator("#timelog-inline-start-time").fill("09:00");
  await page.locator("#timelog-inline-end-time").fill("10:00");

  await page.locator("#timelog-inline-task-selector-input").click();
  await page
    .locator("#timelog-inline-task-selector-input-menu")
    .getByRole("button", { name: taskContent, exact: true })
    .click();

  await page.locator("#timelog-inline-area").click();
  await page
    .locator("#timelog-inline-area-menu")
    .getByRole("button", { name: areaName, exact: true })
    .click();

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText(timelogTitle, { exact: true })).toBeVisible();

  // 5. Insights must reflect the recorded hour for today.
  await page.goto("/stats");
  await expect(page.getByText(new RegExp(areaName, "i"))).toBeVisible();
  await expect(page.getByText("1/24", { exact: true })).toBeVisible();
});

import { test, expect } from "@playwright/test";

test("tasks count chip visible and shows number", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder*="username"]', "admin");
  await page.fill('input[placeholder*="password"]', "admin");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Wait for tasks count chip to appear (chip shows when badge > 0)
  // The link role includes the badge text in its name
  const tasksLink = page.getByRole("link", { name: /^Tasks \d+$/ });
  await expect(tasksLink).toBeVisible({ timeout: 10000 });

  // Get the full text (e.g., "Tasks 7")
  const text = await tasksLink.textContent();
  console.log("Tasks link text:", text);

  // Extract the number
  expect(text).not.toBeNull();
  const match = text?.match(/(\d+)$/);
  expect(match).not.toBeNull();
  const count = parseInt(match![1], 10);
  expect(count).toBeGreaterThan(0);
});

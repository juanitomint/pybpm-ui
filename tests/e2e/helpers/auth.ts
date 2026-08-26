import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Helper function to authenticate user via the login form - always starts fresh
export async function loginUser(page: Page): Promise<void> {
  // Clear cookies and localStorage for a clean slate
  await page.context().clearCookies();

  // Navigate directly to /login with default waitUntil (load event)
  await page.goto("http://localhost:3000/login", { waitUntil: "load" });

  const usernameInput = page.locator('input[placeholder*="username"]').first();
  const passwordInput = page.locator('input[placeholder*="password"]').first();

  // Wait for the inputs to be visible (form may take time to hydrate)
  await expect(usernameInput).toBeVisible({ timeout: 10000 });
  await expect(passwordInput).toBeVisible();

  await usernameInput.fill("admin");
  await passwordInput.fill("admin");

  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible({ timeout: 3000 });
  await submitButton.click();

  // Wait for successful login to redirect to dashboard
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  } catch (e) {
    throw new Error(
      `Login failed. Current URL: ${page.url()}. Body text: ${await page.evaluate(() => document.body.innerText.substring(0, 200))}`,
    );
  }
}

// Helper function to verify user is logged in - clears state and logs in fresh
export async function ensureLoggedIn(page: Page): Promise<void> {
  // ALWAYS force a fresh login - don't trust current state
  await loginUser(page);
}

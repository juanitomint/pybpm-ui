import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers/auth";

// Regression test for the semantic light/dark palette: system-aware default,
// token values on core surfaces, toggle persistence across reload.
const LIGHT_MAIN_BG = "rgb(255, 255, 255)"; // Colors.light.background
const DARK_MAIN_BG = "rgb(18, 18, 18)"; // Colors.dark.background

test("theme tokens: light default → toggle to dark → persists", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await loginUser(page);

  const main = page.locator("main");
  await expect(main).toBeVisible();

  // --- Light mode (system preference, no stored choice) -----------------
  await expect(page.locator("html")).toHaveClass(/light/);
  const htmlClass = (await page.evaluate(
    () => document.querySelector("html")?.className,
  )) as string;
  expect(htmlClass).not.toMatch(/dark/);
  await expect(main).toHaveCSS("background-color", LIGHT_MAIN_BG);
  // New primary token in light mode: #007AFF (would be MUI default rgb(25,118,210) if unfixed)
  await expect(page.locator("header")).toHaveCSS(
    "background-color",
    "rgb(0, 122, 255)",
  );
  // text.primary token: #1A1A1A
  await expect(page.getByRole("heading", { name: /welcome back/i })).toHaveCSS(
    "color",
    "rgb(26, 26, 26)",
  );
  await page.screenshot({ path: "/tmp/pybpm-ui-theme-light.png" });

  // --- Toggle to dark ----------------------------------------------------
  const toggle = page.getByLabel("Toggle theme");
  await toggle.click({ force: true });

  await expect(page.locator("html")).toHaveClass(/dark/);
  const storedTheme = await page.evaluate(() =>
    localStorage.getItem("theme"),
  );
  expect(storedTheme).toBe("dark");
  await expect(main).toHaveCSS("background-color", DARK_MAIN_BG);
  // MUI v9 AppBar defaults to a surface bar in dark mode (enableColorOnDark=false),
  // so the header takes Colors.dark.surface — not primary.
  await expect(page.locator("header")).toHaveCSS(
    "background-color",
    "rgb(30, 30, 30)",
  );
  await page.screenshot({ path: "/tmp/pybpm-ui-theme-dark.png" });

  // --- Kanban board in dark mode uses per-mode tints ----------------------
  await page.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/\/dashboard\/tasks/);
  const bgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*"))
      .map((el) => getComputedStyle(el).backgroundColor)
      .filter(Boolean),
  );
  // in_progress dark tint #0a1b2e, pending dark tint #242424
  expect(bgs).toContain("rgb(10, 27, 46)");
  expect(bgs).toContain("rgb(36, 36, 36)");
  await page.screenshot({ path: "/tmp/pybpm-ui-theme-dark-tasks.png" });

  // --- Reload: stored preference must survive (still dark) ---------------
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

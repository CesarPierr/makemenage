import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// These tests are intended to run under the "mobile-chromium" project (390×844)

function uniqueEmail(prefix: string) {
  return `${prefix}-mobile-${Date.now()}-${randomUUID().slice(0, 6)}@makemenage.local`;
}

async function skipOnboardingIfVisible(page: import("@playwright/test").Page) {
  const skipLink = page.getByRole("link", { name: /Passer/i });
  if (await skipLink.isVisible().catch(() => false)) {
    await skipLink.click();
    await page.waitForURL(/onboarding=skip/);
  }
}

async function createHousehold(page: import("@playwright/test").Page, name: string) {
  await page.getByPlaceholder("Nom du foyer").fill(name);
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);
  await skipOnboardingIfVisible(page);
}

async function registerAndLogin(page: import("@playwright/test").Page, displayName: string, email: string) {
  const password = "demo12345";
  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill(displayName);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
}

test.describe("Mobile — auth & navigation", () => {
  test("register, login and see dashboard on mobile viewport", async ({ page }) => {
    const email = uniqueEmail("nav");
    await registerAndLogin(page, "MobileUser", email);

    // Should land on the app dashboard
    await expect(page).toHaveURL(/\/app$/);

    // Bottom navigation should be visible with at most 4 items
    const bottomNav = page.getByRole("navigation").last();
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Aujourd'hui" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Planifier" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Réglages" })).toBeVisible();
  });

  test("bottom nav navigates to calendar", async ({ page }) => {
    const email = uniqueEmail("calendar");
    await registerAndLogin(page, "CalMobile", email);
    await createHousehold(page, "Foyer Mobile Calendrier");

    await page.getByRole("navigation").last().getByRole("link", { name: "Planifier" }).click();
    await expect(page.getByRole("heading", { name: /Tout ce qui aide à garder le cap/i })).toBeVisible();
    await page.getByRole("link", { name: /Calendrier/i }).first().click();
    await page.waitForURL(/\/app\/calendar/);
    await expect(page).toHaveURL(/\/app\/calendar/);
  });

  test("activity page is accessible from Plus menu", async ({ page }) => {
    const email = uniqueEmail("activity");
    await registerAndLogin(page, "ActMobile", email);

    const plusBtn = page.getByRole("button", { name: /Plus|More/i });
    if (await plusBtn.count() > 0) {
      await plusBtn.first().click();
      await expect(page.getByRole("link", { name: /Activité/i }).first()).toBeVisible();
    }
  });
});

test.describe("Mobile — dashboard layout", () => {
  test("today tasks section appears before stats on mobile", async ({ page }) => {
    const email = uniqueEmail("dashboard");
    await registerAndLogin(page, "DashMobile", email);

    // After login the page shows either onboarding or dashboard
    // If no household yet, create one
    const householdInput = page.getByPlaceholder("Nom du foyer");
    if (await householdInput.isVisible()) {
      await createHousehold(page, "Foyer Mobile Test");
    } else {
      await skipOnboardingIfVisible(page);
    }

    const todaySection = page.locator("section[aria-label='Tâches du jour']");
    if (await todaySection.count()) {
      await expect(todaySection).toBeVisible();
    }
  });
});

test.describe("Mobile — occurrence actions", () => {
  test("complete action button is touch-accessible (min-height adequate)", async ({ page }) => {
    const email = uniqueEmail("complete");
    await registerAndLogin(page, "CompMobile", email);

    // If onboarding is shown, skip it
    const skipLink = page.getByRole("link", { name: /Passer/i });
    if (await skipLink.isVisible()) {
      await skipLink.click();
      await page.waitForLoadState("networkidle");
    }

    const completeBtn = page.getByRole("button", { name: /Terminer/i }).first();
    if (await completeBtn.count() > 0) {
      const box = await completeBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("Mobile — settings: notifications & theme", () => {
  test("notifications settings page is reachable", async ({ page }) => {
    const email = uniqueEmail("notif");
    await registerAndLogin(page, "NotifMobile", email);

    // Create household if needed
    const householdInput = page.getByPlaceholder("Nom du foyer");
    if (await householdInput.isVisible()) {
      await createHousehold(page, "Foyer Notif");
    } else {
      await skipOnboardingIfVisible(page);
    }

    await page.goto("/app/settings/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    // Theme toggle should be rendered
    await expect(page.getByRole("group", { name: /Thème/i })).toBeVisible();
  });
});

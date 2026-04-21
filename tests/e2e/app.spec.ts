import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

function buildUniqueEmail(prefix: string, projectName: string) {
  const safeProjectName = projectName.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  return `${prefix}-${safeProjectName}-${Date.now()}-${randomUUID().slice(0, 8)}@makemenage.local`;
}

test("register API returns a usable redirect and session cookie over HTTP", async ({ request }, testInfo) => {
  const response = await request.fetch("/api/auth/register", {
    method: "POST",
    form: {
      displayName: "API User",
      email: buildUniqueEmail("api", testInfo.project.name),
      password: "demo12345",
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toBe("http://localhost:3100/app");
  expect(response.headers()["set-cookie"]).toContain("makemenage_session=");
  expect(response.headers()["set-cookie"]).not.toContain("Secure");
});

test("user can register, create a household, add a member, create a task, and complete it", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("e2e", testInfo.project.name);

  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("E2E User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("heading", { name: "Créer votre premier foyer" })).toBeVisible();
  await page.getByPlaceholder("Nom du foyer").fill("Foyer E2E");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();

  await expect(page.getByRole("heading", { name: /Vue rapide du foyer/i })).toBeVisible();

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Ajouter un membre" })).toBeVisible();
  await page.getByPlaceholder("Nom affiché").fill("Sam");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.locator('option[value]', { hasText: "Sam" })).toHaveCount(1);

  await page.goto("/app");
  await page.getByPlaceholder("Titre de la tâche").fill("Nettoyer le salon");
  await page.locator('input[name="estimatedMinutes"]').fill("25");
  await page.getByPlaceholder("Catégorie").fill("Nettoyage");
  await page.getByPlaceholder("Pièce").fill("Salon");
  await page.locator('input[name="startsOn"]').fill("2026-04-21");
  await page.locator('input[name="interval"]').fill("1");
  await page
    .locator('select[name="eligibleMemberIds"]')
    .selectOption([{ index: 0 }, { index: 1 }]);
  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await expect(page.getByRole("heading", { name: "Nettoyer le salon" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Marquer faite" }).first().click();

  await page.goto("/app/history");
  await expect(page.getByText(/completed/i).first()).toBeVisible();

  await page.goto("/app/calendar");
  const calendarExport = await page.locator('a[href*="/api/calendar/feed.ics"]').first().getAttribute("href");
  expect(calendarExport).toContain("/api/calendar/feed.ics");
});

test("demo user can reach login and auth redirect works", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Retrouver le planning du foyer" })).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

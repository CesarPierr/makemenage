import { randomUUID } from "node:crypto";
import { addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";

import { expect, test, type Locator } from "@playwright/test";

function buildUniqueEmail(prefix: string, projectName: string) {
  const safeProjectName = projectName.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  return `${prefix}-${safeProjectName}-${Date.now()}-${randomUUID().slice(0, 8)}@makemenage.local`;
}

async function expectCopyButtonToReact(button: Locator) {
  await button.click();
  await expect(button).toContainText(/copiée|manuelle/i);
}

test("register API redirects to login without creating a session cookie", async ({ request }, testInfo) => {
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
  expect(response.headers()["location"]).toContain("http://localhost:3100/login?registered=1");
  expect(response.headers()["location"]).toContain("email=");
  expect(response.headers()["set-cookie"] ?? "").not.toContain("makemenage_session=");
});

test("login API returns a usable redirect and session cookie over HTTP", async ({ request }, testInfo) => {
  const email = buildUniqueEmail("login-api", testInfo.project.name);

  const registerResponse = await request.fetch("/api/auth/register", {
    method: "POST",
    form: {
      displayName: "Login API User",
      email,
      password: "demo12345",
    },
    maxRedirects: 0,
  });

  expect(registerResponse.status()).toBe(303);

  const response = await request.fetch("/api/auth/login", {
    method: "POST",
    form: {
      email,
      password: "demo12345",
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toBe("http://localhost:3100/app");
  expect(response.headers()["set-cookie"]).toContain("makemenage_session=");
  expect(response.headers()["set-cookie"]).not.toContain("Secure");
});

test("user can register, login, create a household, add a member, create a task, and complete it", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("e2e", testInfo.project.name);
  const isMobileProject = testInfo.project.name.includes("mobile");
  const today = new Date().toISOString().slice(0, 10);
  const nextMonthLabel = format(addMonths(new Date(), 1), "MMMM yyyy", { locale: fr });

  await page.goto("/register");
  await expect(page.getByText("Démarrage rapide sans écran inutile")).toBeVisible();
  await page.getByPlaceholder("Prénom ou pseudo").fill("E2E User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByText("Compte créé. Connectez-vous pour accéder à votre foyer.")).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toHaveValue(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Créer votre premier foyer" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Créer votre premier foyer" })).toBeVisible();
  await page.getByPlaceholder("Nom du foyer").fill("Foyer E2E");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();

  await expect(page.getByRole("heading", { name: /Vue rapide du foyer/i })).toBeVisible();
  const mainNavigation = page.getByRole("navigation");
  await expect(mainNavigation.getByRole("link", { name: "Mes tâches" })).toBeVisible();
  await expect(mainNavigation.getByRole("link", { name: "Réglages" })).toBeVisible();
  await expect(mainNavigation.getByRole("link", { name: "Accueil" })).toBeVisible();

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
  await page.locator('input[name="startsOn"]').fill(today);
  await page.locator('input[name="interval"]').fill("1");
  await page.locator('select[name="eligibleMemberIds"]').selectOption([{ index: 0 }]);
  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await page.goto("/app/my-tasks");
  await expect(page.getByRole("heading", { name: "Nettoyer le salon" }).first()).toBeVisible();
  await page.locator('input[name="actualMinutes"]').first().fill("32");
  await page.locator('input[name="notes"]').first().fill("Salon plus poussiéreux que prévu");
  await page.getByRole("button", { name: "Marquer faite" }).first().click();

  await page.goto("/app/history");
  await expect(page.getByText("Terminée").first()).toBeVisible();
  await expect(page.getByText(/Validée par/i).first()).toBeVisible();

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "7 derniers jours" })).toBeVisible();
  await expect(page.getByText("32 min").first()).toBeVisible();

  await page.goto("/app/calendar");
  await expect(page.getByRole("heading", { name: "Google Calendar et iCal" })).toBeVisible();
  const householdIcalCopyButton = page.getByRole("button", { name: "Copier l’URL iCal du foyer" });
  await expect(householdIcalCopyButton).toBeVisible();
  await expectCopyButtonToReact(householdIcalCopyButton);
  await expect(page.getByRole("link", { name: "Ouvrir Google Calendar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: new RegExp(nextMonthLabel, "i") })).toBeVisible();
  if (isMobileProject) {
    await expect(page.getByRole("heading", { name: "Prochaines tâches" }).first()).toBeVisible();
    await expect(page.getByText(/jours actifs/i).first()).toBeVisible();
  }
  const calendarExport = await page.locator('a[href*="/api/calendar/feed.ics"]').first().getAttribute("href");
  expect(calendarExport).toContain("/api/calendar/feed.ics");
});

test("two accounts can share a household, one account can keep multiple households, and can leave one later", async ({
  browser,
  page,
}, testInfo) => {
  const ownerEmail = buildUniqueEmail("owner", testInfo.project.name);
  const guestEmail = buildUniqueEmail("guest", testInfo.project.name);

  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Owner");
  await page.getByPlaceholder("Email").fill(ownerEmail);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);

  await page.getByPlaceholder("Nom du foyer").fill("Foyer partagé");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  const inviteLinkCopyButton = page.getByRole("button", { name: "Copier le lien" }).first();
  const inviteCodeCopyButton = page.getByRole("button", { name: "Copier le code" }).first();
  await expectCopyButtonToReact(inviteLinkCopyButton);
  await expectCopyButtonToReact(inviteCodeCopyButton);
  const inviteLink = await page.getByRole("link", { name: "Ouvrir le lien d’invitation" }).first().getAttribute("href");
  expect(inviteLink).toContain("/join/");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  await guestPage.goto(inviteLink!);
  await expect(guestPage.getByRole("heading", { name: /Rejoindre le foyer/i })).toBeVisible();
  await guestPage.getByRole("link", { name: "Créer un compte" }).click();
  await guestPage.getByPlaceholder("Prénom ou pseudo").fill("Guest");
  await guestPage.getByPlaceholder("Email").fill(guestEmail);
  await guestPage.getByPlaceholder("Mot de passe").fill("demo12345");
  await guestPage.getByRole("button", { name: "Créer mon compte" }).click();
  await guestPage.waitForURL(/\/login\?/);
  await guestPage.getByPlaceholder("Mot de passe").fill("demo12345");
  await guestPage.getByRole("button", { name: "Se connecter" }).click();
  await guestPage.waitForURL(/\/join\//);
  await guestPage.getByRole("button", { name: "Rejoindre ce foyer" }).click();
  await guestPage.waitForURL(/\/app\?household=.*joined=1/);
  await expect(guestPage.getByText("Nouveau foyer relié au compte")).toBeVisible();

  await guestPage.goto("/app/settings");
  await expect(guestPage.getByText("Foyer partagé")).toBeVisible();
  await guestPage.getByPlaceholder("Nom du nouveau foyer").fill("Deuxième foyer");
  await guestPage.locator('form[action="/api/households"] input[name="timezone"]').fill("Europe/Paris");
  await guestPage.getByRole("button", { name: "Créer un autre foyer" }).click();
  await guestPage.waitForLoadState("networkidle");
  await guestPage.goto("/app/settings");
  await expect(guestPage.getByText("Foyer partagé")).toBeVisible();
  await expect(guestPage.getByText("Deuxième foyer")).toBeVisible();

  await guestPage.getByRole("link", { name: "Ouvrir" }).first().click();
  await guestPage.waitForLoadState("networkidle");
  await guestPage.goto("/app/settings");
  await guestPage.getByRole("button", { name: "Quitter ce foyer" }).click();
  await guestPage.waitForLoadState("networkidle");
  await guestPage.goto("/app/settings");
  await expect(guestPage.getByText("Deuxième foyer")).toBeVisible();
  await expect(guestPage.getByText("Foyer partagé")).toHaveCount(0);

  await guestContext.close();
});

test("a skipped task can be corrected and completed later with actual minutes", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("correct-skip", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Correct Skip");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
  await page.getByPlaceholder("Nom du foyer").fill("Foyer correction");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForLoadState("networkidle");

  await page.getByPlaceholder("Titre de la tâche").fill("Passer l’aspirateur");
  await page.locator('input[name="estimatedMinutes"]').fill("20");
  await page.getByPlaceholder("Catégorie").fill("Nettoyage");
  await page.getByPlaceholder("Pièce").fill("Salon");
  await page.locator('input[name="startsOn"]').fill(today);
  await page.locator('input[name="interval"]').fill("1");
  await page.locator('select[name="eligibleMemberIds"]').selectOption([{ index: 0 }]);
  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await page.goto("/app/my-tasks");
  await page.locator('input[name="notes"]').nth(1).fill("Pas le temps aujourd’hui");
  await page.getByRole("button", { name: "Sauter" }).first().click();
  await expect(page.getByText("Sautée").first()).toBeVisible();

  await page.locator('input[name="actualMinutes"]').first().fill("27");
  await page.locator('input[name="notes"]').first().fill("Finalement faite en fin de journée");
  await page.getByRole("button", { name: "Marquer faite" }).first().click();

  await expect(page.getByText("Terminée").first()).toBeVisible();
  await expect(page.getByText("Réel 27 min").first()).toBeVisible();
});

test("adding a member can rebalance future strict alternation tasks", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("rebalance-member", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Rebalance User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);

  await page.getByPlaceholder("Nom du foyer").fill("Foyer rebalance");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/settings");
  await page.getByPlaceholder("Nom affiché").fill("Sam");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.locator('option[value]', { hasText: "Sam" })).toHaveCount(1);

  await page.goto("/app");
  await page.getByPlaceholder("Titre de la tâche").fill("Rotation quotidienne");
  await page.locator('input[name="estimatedMinutes"]').fill("15");
  await page.getByPlaceholder("Catégorie").fill("Routine");
  await page.getByPlaceholder("Pièce").fill("Cuisine");
  await page.locator('input[name="startsOn"]').fill(today);
  await page.locator('input[name="interval"]').fill("1");
  await page.locator('select[name="eligibleMemberIds"]').selectOption([{ index: 0 }, { index: 1 }]);
  await page.getByRole("button", { name: "Créer la tâche" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/settings");
  await page.getByPlaceholder("Nom affiché").fill("Lea");
  await page.locator('input[name="color"]').fill("#2E8B57");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Rotation quotidienne · Lea/i }).first()).toBeVisible();
});

test("invalid login keeps the user on login with a clear error message", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("invalid-login", testInfo.project.name);

  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Invalid Login User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("wrongpass123");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page).toHaveURL(/\/login\?/);
  await expect(
    page.getByText("Email ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez."),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toHaveValue(email);
});

test("demo user can reach login and auth redirect works", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Retrouver le planning du foyer" })).toBeVisible();
  await expect(page.getByText("Actions en un geste sur téléphone")).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

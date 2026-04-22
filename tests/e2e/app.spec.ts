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
  await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
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
  await expect(mainNavigation.getByRole("link", { name: "Tâches" })).toBeVisible();
  await expect(mainNavigation.getByRole("link", { name: "Réglages" })).toBeVisible();
  await expect(mainNavigation.getByRole("link", { name: "Accueil" })).toBeVisible();

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Membres" })).toBeVisible();
  await page.getByPlaceholder("Nom affiché").fill("Sam");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.locator('option[value]', { hasText: "Sam" })).toHaveCount(1);

  await page.goto("/app/my-tasks");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  
  // Étape 1
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Nettoyer le salon");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("25");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Nettoyage");
  await page.getByPlaceholder("Ex: Cuisine").fill("Salon");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Étape 2
  await page.locator('input[type="date"]').fill(today);
  await page.getByRole("button", { name: "Chaque semaine" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Étape 3
  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await page.goto("/app/my-tasks");
  await expect(page.getByRole("heading", { name: "Nettoyer le salon" }).first()).toBeVisible();
  await page.getByText("Ajuster minutes, note, date ou attribution").first().click();
  await page.locator('input[name="actualMinutes"]').first().fill("32");
  await page.locator('input[name="notes"]').first().fill("Salon plus poussiéreux que prévu");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();

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

  await page.goto("/app/my-tasks");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Passer l’aspirateur");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("20");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Nettoyage");
  await page.getByPlaceholder("Ex: Cuisine").fill("Salon");
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.locator('input[type="date"]').fill(today);
  await page.getByRole("button", { name: "Chaque semaine" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await page.goto("/app/my-tasks");
  await page.getByText("Ajuster minutes, note, date ou attribution").first().click();
  await page.locator('input[name="notes"]').nth(1).fill("Pas le temps aujourd’hui");
  await page.getByRole("button", { name: "Sauter avec note" }).first().click();
  await expect(page.getByText("Sautée").first()).toBeVisible();

  await page.getByText("Ajuster minutes, note, date ou attribution").first().click();
  await page.locator('input[name="actualMinutes"]').first().fill("27");
  await page.locator('input[name="notes"]').first().fill("Finalement faite en fin de journée");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();

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

  await page.goto("/app/my-tasks");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Rotation quotidienne");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("15");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Routine");
  await page.getByPlaceholder("Ex: Cuisine").fill("Cuisine");
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.locator('input[type="date"]').fill(today);
  await page.getByRole("button", { name: "Chaque semaine" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

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
  await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
  await expect(page.getByText("Tâches, calendrier et historique du foyer.")).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("can edit a task template and overwrite or preserve manual modifications", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("edit-task", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  // 1. Setup account and household
  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Edit Task User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
  await page.getByPlaceholder("Nom du foyer").fill("Foyer Edition");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForLoadState("networkidle");

  // 2. Create task
  // 2. Create task
  await page.goto("/app/my-tasks");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Tâche à modifier");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("20");
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.locator('input[type="date"]').fill(today);
  await page.getByRole("button", { name: "Chaque semaine" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByRole("button", { name: "Créer la tâche" }).click();
  await page.waitForLoadState("networkidle");

  // 3. Manually modify the first occurrence (reschedule)
  await page.goto("/app/my-tasks");
  await page.getByText("Ajuster minutes, note, date ou attribution").first().click();
  await page.locator('form[action*="/reschedule"] input[name="date"]').first().fill(today); // Reschedule to today
  await page.getByRole("button", { name: "Changer la date" }).first().click();
  await expect(page.getByText("Reportée").first()).toBeVisible();

  // 4. Edit the task template (without overwriting manual)
  await page.goto("/app/settings");
  await page.locator('article', { hasText: "Tâche à modifier" }).getByRole("button", { name: "Modifier" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator('input[name="title"]').fill("Tâche modifiée (sans écraser)");
  await editDialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForLoadState("networkidle");

  // 5. Check that the manual modification was preserved (still Reportée)
  await page.goto("/app/my-tasks");
  await expect(page.getByRole("heading", { name: "Tâche modifiée (sans écraser)" }).first()).toBeVisible();
  await expect(page.getByText("Reportée").first()).toBeVisible();

  // 6. Edit the task template WITH overwriting manual
  await page.goto("/app/settings");
  await page.locator('article', { hasText: "Tâche modifiée (sans écraser)" }).getByRole("button", { name: "Modifier" }).click();
  const editDialog2 = page.getByRole("dialog");
  await editDialog2.locator('input[name="title"]').fill("Tâche modifiée (avec écrasement)");
  await editDialog2.locator('input[name="forceOverwriteManual"]').check();
  await editDialog2.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForLoadState("networkidle");

  // 7. Check that the manual modification was overwritten (should no longer be Reportée)
  await page.goto("/app/my-tasks");
  await expect(page.getByRole("heading", { name: "Tâche modifiée (avec écrasement)" }).first()).toBeVisible();
  await expect(page.getByText("Reportée")).toHaveCount(0);
});

test("deleting a task removes it from settings and calendar", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("delete-task", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  // Setup account and household
  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill("Delete Task User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill("demo12345");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
  await page.getByPlaceholder("Nom du foyer").fill("Foyer Suppression");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForLoadState("networkidle");

  // Create task
  // Create task
  await page.goto("/app/my-tasks");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Tâche à supprimer");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("15");
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.locator('input[type="date"]').fill(today);
  await page.getByRole("button", { name: "Chaque semaine" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByRole("button", { name: "Créer la tâche" }).click();
  await page.waitForLoadState("networkidle");

  // Verify task appears in calendar
  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Tâche à supprimer/i }).first()).toBeVisible();

  // Delete the task
  await page.goto("/app/settings");
  await page.locator('article', { hasText: "Tâche à supprimer" }).getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/Supprimer "Tâche à supprimer" \?/i)).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await page.waitForLoadState("networkidle");

  // Verify task is removed from settings
  await expect(page.getByText("Tâche à supprimer")).toHaveCount(0);

  // Verify task is removed from calendar
  await page.goto("/app/calendar");
  await expect(page.getByText("Tâche à supprimer")).toHaveCount(0);
});

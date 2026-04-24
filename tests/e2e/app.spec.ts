import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

function buildUniqueEmail(prefix: string, projectName: string) {
  const safeProjectName = projectName.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `${prefix}-${safeProjectName}-${Date.now()}-${randomUUID().slice(0, 8)}@makemenage.local`;
}

async function expectCopyButtonToReact(button: Locator) {
  await button.click();
  await expect(button).toContainText(/copiée|manuelle/i);
}

async function registerAndLogin(
  page: Page,
  values: { displayName: string; email: string; password?: string },
) {
  const password = values.password ?? "demo12345";
  await page.goto("/register");
  await page.getByPlaceholder("Prénom ou pseudo").fill(values.displayName);
  await page.getByPlaceholder("Email").fill(values.email);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/login\?/);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
}

async function createHousehold(page: Page, householdName: string) {
  await page.getByPlaceholder("Nom du foyer").fill(householdName);
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);
  // Skip onboarding wizard if shown (no tasks yet)
  const skipLink = page.getByRole("link", { name: /Passer/i });
  if (await skipLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipLink.click();
    await page.waitForLoadState("networkidle");
  }
}

async function createTaskFromWizard(
  page: Page,
  values: {
    title: string;
    minutes: string;
    category?: string;
    room?: string;
    kind?: "single" | "recurring";
    recurrenceLabel?: string;
    assignmentLabel?: string;
    memberLabel?: string;
  },
) {
  const today = new Date().toISOString().slice(0, 10);

  await page.goto("/app/settings/tasks?tab=wizard");
  await expect(page.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill(values.title);
  await page.locator('input[name="estimatedMinutesVisible"]').fill(values.minutes);

  if (values.category) {
    await page.getByPlaceholder("Ex: Nettoyage").fill(values.category);
  }
  if (values.room) {
    await page.getByPlaceholder("Ex: Cuisine").fill(values.room);
  }
  if (values.kind === "single") {
    await page.getByRole("button", { name: "Tâche simple" }).click();
  }

  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("textbox", { name: values.kind === "single" ? "Date" : "Première date" }).fill(today);

  if (values.kind !== "single" && values.recurrenceLabel) {
    await page.getByRole("button", { name: values.recurrenceLabel }).click();
  }

  await page.getByRole("button", { name: "Continuer" }).click();

  if (values.memberLabel) {
    await page.getByRole("button", { name: new RegExp(values.memberLabel, "i") }).click();
  }
  if (values.kind !== "single" && values.assignmentLabel) {
    await page.getByRole("button", { name: new RegExp(values.assignmentLabel, "i") }).click();
  }

  const createTaskPromise = page.waitForResponse(
    (response) => response.url().includes("/api/tasks") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Créer la tâche/i }).click();
  await createTaskPromise;
}

async function openTaskAdministration(page: Page) {
  await page.goto("/app/settings/tasks");
  await expect(
    page.getByRole("heading", { name: /Catalogue du foyer|Gérer la bibliothèque|Bibliothèque de tâches|Gérer le catalogue/i }),
  ).toBeVisible();
}

function getManagedTaskCard(page: Page, title: string) {
  return page.locator("article.soft-panel", { hasText: title });
}

async function openSettingsPanel(
  page: Page,
  panel: "households" | "team" | "access" | "planning" | "danger" | "notifications",
) {
  const currentUrl = new URL(page.url());
  const household = currentUrl.searchParams.get("household");
  const suffix = household ? `?household=${household}` : "";
  await page.goto(`/app/settings/${panel}${suffix}`);
}

function getOccurrenceCard(page: Page, title: string) {
  return page.locator("article", { has: page.getByRole("heading", { name: title }) }).first();
}

async function openOccurrenceActionSheet(page: Page, title: string) {
  await getOccurrenceCard(page, title)
    .getByRole("button", { name: new RegExp(`Actions pour ${title}`, "i") })
    .click();
}

async function quickSkipOccurrence(page: Page, title: string) {
  const skipResponse = page.waitForResponse(
    (r) => r.url().includes("/skip") && r.request().method() === "POST",
  );
  await getOccurrenceCard(page, title)
    .getByRole("button", { name: new RegExp(`Passer "${title}"`, "i") })
    .click();
  await skipResponse;
}

async function completeOccurrenceWithDetails(
  page: Page,
  title: string,
  values: { actualMinutes?: string; notes?: string } = {},
) {
  await openOccurrenceActionSheet(page, title);
  await page.getByRole("button", { name: "Terminer avec détails" }).click();
  const detailDialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Terminer avec détails" }) })
    .last();
  await expect(detailDialog).toBeVisible();

  if (values.actualMinutes) {
    await detailDialog.locator('input[name="actualMinutes"]').fill(values.actualMinutes);
  }
  if (values.notes) {
    await detailDialog.locator('input[name="notes"]').fill(values.notes);
  }

  const savePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/complete") && response.request().method() === "POST",
  );
  await detailDialog.getByRole("button", { name: "Enregistrer" }).click();
  await savePromise;
}

async function rescheduleOccurrence(page: Page, title: string, date: string) {
  await openOccurrenceActionSheet(page, title);
  await page.getByRole("button", { name: "Faire plus tard" }).click();
  const rescheduleDialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Faire plus tard" }) })
    .last();
  await expect(rescheduleDialog).toBeVisible();
  await rescheduleDialog.locator('input[name="date"]').fill(date);
  await rescheduleDialog.getByRole("button", { name: "Changer la date" }).click();
}

// ── API unit-level tests ─────────────────────────────────────────────────────

test("register API redirects to login without creating a session cookie", async ({
  request,
}, testInfo) => {
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

test("login API returns a usable redirect and session cookie over HTTP", async ({
  request,
}, testInfo) => {
  const email = buildUniqueEmail("login-api", testInfo.project.name);

  const registerResponse = await request.fetch("/api/auth/register", {
    method: "POST",
    form: { displayName: "Login API User", email, password: "demo12345" },
    maxRedirects: 0,
  });
  expect(registerResponse.status()).toBe(303);

  const response = await request.fetch("/api/auth/login", {
    method: "POST",
    form: { email, password: "demo12345" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toBe("http://localhost:3100/app");
  expect(response.headers()["set-cookie"]).toContain("makemenage_session=");
  expect(response.headers()["set-cookie"]).not.toContain("Secure");
});

// ── Auth flow ────────────────────────────────────────────────────────────────

test("invalid login keeps the user on login with a clear error message", async ({
  page,
}, testInfo) => {
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

test("unauthenticated access to /app redirects to login", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
  await expect(page.getByText("Tâches, calendrier et historique du foyer.")).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

// ── Core golden path ─────────────────────────────────────────────────────────

test("user can register, login, create a household, add a member, create a task, and complete it", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("e2e", testInfo.project.name);
  const isMobileProject = testInfo.project.name.includes("mobile");
  const today = new Date().toISOString().slice(0, 10);

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
  await expect(page.getByRole("heading", { name: "Mettez votre foyer en route" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Mettez votre foyer en route" })).toBeVisible();
  await page.getByPlaceholder("Nom du foyer").fill("Foyer E2E");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();

  // Onboarding wizard shows after creating first household
  await expect(page.getByRole("heading", { name: /Bienvenue/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Aujourd'hui" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Planifier" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Réglages" }).filter({ visible: true }).first()).toBeVisible();

  await openSettingsPanel(page, "team");
  await expect(page.getByRole("heading", { name: "Membres" })).toBeVisible();
  await page.getByPlaceholder("Nom affiché").fill("Sam");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.getByText("Sam").first()).toBeVisible();

  await page.goto("/app/my-tasks?tab=wizard");
  await expect(page.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();

  // Step 1 – task details
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Nettoyer le salon");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("25");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Nettoyage");
  await page.getByPlaceholder("Ex: Cuisine").fill("Salon");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 2 – schedule
  await page.getByRole("textbox", { name: "Première date" }).fill(today);
  await page.getByRole("button", { name: "Tous les jours" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 3 – assignment
  const createTaskPromise = page.waitForResponse(
    (response) => response.url().includes("/api/tasks") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Créer la tâche/i }).click();
  await createTaskPromise;

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Nettoyer le salon" }).first()).toBeVisible();
  await completeOccurrenceWithDetails(page, "Nettoyer le salon", {
    actualMinutes: "32",
    notes: "Salon plus poussiéreux que prévu",
  });

  await page.goto("/app/settings/activity");
  await expect(page.getByText("Terminée").first()).toBeVisible();
  await expect(page.getByText(/Validée par/i).first()).toBeVisible();

  await page.goto("/app");
  await expect(page.getByRole("main").getByRole("heading", { name: "Aujourd'hui" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tâches du jour" })).toContainText("0 tâche");

  await page.goto("/app/calendar");
  await expect(page.getByText(/Jours actifs/i).first()).toBeVisible();

  if (isMobileProject) {
    await page.getByRole("link", { name: "Suivant" }).click();
    await expect(page).toHaveURL(/dayOffset=4/);
    await expect(page.getByRole("heading", { name: "Les 7 prochains jours" }).first()).toBeVisible();
    await expect(page.getByText(/jours actifs/i).first()).toBeVisible();
  } else {
    await page.getByTitle("Mois suivant").click();
    await expect(page).toHaveURL(/monthOffset=1/);
    await expect(page.getByText(/Jours actifs/i).first()).toBeVisible();
  }

  await page.getByRole("button", { name: "Synchroniser" }).click();
  await expect(page.getByRole("heading", { name: "Abonnement iCal" })).toBeVisible();
  const householdIcalCopyButton = page.getByRole("button", { name: /Copier l.?URL/i }).first();
  await expect(householdIcalCopyButton).toBeVisible();
  await expectCopyButtonToReact(householdIcalCopyButton);
  await expect(page.getByRole("link", { name: "Ouvrir Google Calendar" })).toBeVisible();
  await page.getByRole("button", { name: "Exporter" }).click();
  await expect(page.getByRole("heading", { name: "Télécharger" })).toBeVisible();
  const calendarExport = await page.getByRole("link", { name: "Export complet foyer" }).getAttribute("href");
  expect(calendarExport).toContain("/api/calendar/feed.ics");
});

// ── Task management ──────────────────────────────────────────────────────────

test("user can create a simple one-time task assigned to one member", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("single-task", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Single Task User", email });
  await createHousehold(page, "Foyer Simple");

  await openSettingsPanel(page, "team");
  await page.getByPlaceholder("Nom affiché").fill("Alice");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.getByText("Alice").first()).toBeVisible();

  await createTaskFromWizard(page, {
    title: "Passage unique",
    minutes: "10",
    category: "Nettoyage",
    room: "Tout l'appartement",
    kind: "single",
    memberLabel: "Alice",
  });

  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Passage unique · Alice/i }).first()).toBeVisible();

  await openTaskAdministration(page);
  await expect(getManagedTaskCard(page, "Passage unique")).toContainText(/unique occurrence|une seule fois/i);
});

test("can edit a task and overwrite or preserve manual modifications", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("edit-task", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Edit Task User", email });
  await createHousehold(page, "Foyer Edition");

  await createTaskFromWizard(page, {
    title: "Tâche à modifier",
    minutes: "20",
    recurrenceLabel: "Chaque semaine",
  });

  await page.goto("/app/my-tasks?tab=daily");
  await rescheduleOccurrence(page, "Tâche à modifier", today);
  await expect(page.getByText("Reportée").first()).toBeVisible();

  // Edit without overwriting manual modifications
  await openTaskAdministration(page);
  await getManagedTaskCard(page, "Tâche à modifier").getByRole("button", { name: "Modifier" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator('input[name="title"]').fill("Tâche modifiée (sans écraser)");
  await editDialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Tâche modifiée (sans écraser)" }).first()).toBeVisible();
  await expect(page.getByText("Reportée").first()).toBeVisible();

  // Edit with overwrite
  await openTaskAdministration(page);
  await getManagedTaskCard(page, "Tâche modifiée (sans écraser)").getByRole("button", { name: "Modifier" }).click();
  const editDialog2 = page.getByRole("dialog");
  await editDialog2.locator('input[name="title"]').fill("Tâche modifiée (avec écrasement)");
  await editDialog2.locator('input[name="forceOverwriteManual"]').check();
  await editDialog2.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Tâche modifiée (avec écrasement)" }).first()).toBeVisible();
  await expect(page.getByText("Reportée")).toHaveCount(0);
});

test("deleting a task removes it from settings and calendar", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("delete-task", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Delete Task User", email });
  await createHousehold(page, "Foyer Suppression");

  await createTaskFromWizard(page, {
    title: "Tâche à supprimer",
    minutes: "15",
    recurrenceLabel: "Chaque semaine",
  });

  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Tâche à supprimer/i }).first()).toBeVisible();

  await openTaskAdministration(page);
  await getManagedTaskCard(page, "Tâche à supprimer").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/Supprimer "Tâche à supprimer" \?/i)).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Tâche à supprimer")).toHaveCount(0);

  await page.goto("/app/calendar");
  await expect(page.getByText("Tâche à supprimer")).toHaveCount(0);
});

test("manual override badge opens a dedicated page and keeps future occurrences editable", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("override-detail", testInfo.project.name);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Override Detail User", email });
  await createHousehold(page, "Foyer Overrides");

  await createTaskFromWizard(page, {
    title: "Linge à relancer",
    minutes: "14",
    recurrenceLabel: "Chaque semaine",
  });

  await page.goto("/app/my-tasks");
  await rescheduleOccurrence(page, "Linge à relancer", tomorrow);
  await expect(page.getByText("Reportée").first()).toBeVisible();

  await openTaskAdministration(page);
  const managedTask = getManagedTaskCard(page, "Linge à relancer");
  await managedTask.getByRole("link", { name: /occurrence future modifiée/i }).click();

  await expect(page).toHaveURL(/\/app\/my-tasks\/overrides\/.+household=/);
  await expect(page.locator("h2", { hasText: "Linge à relancer" })).toBeVisible();
  await expect(page.getByText("Date déplacée").first()).toBeVisible();
  await expect(page.getByText(/Dernier changement/i).first()).toBeVisible();

  await rescheduleOccurrence(page, "Linge à relancer", inTwoDays);

  await expect(page).toHaveURL(/\/app\/my-tasks\/overrides\/.+household=/);
  await expect(page.getByText("Reportée").first()).toBeVisible();
  await expect(page.getByText("Date actuelle:").first()).toBeVisible();
});

// ── Occurrence actions ───────────────────────────────────────────────────────

test("a skipped task can be corrected and completed later with actual minutes", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("correct-skip", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Correct Skip User", email });
  await page.getByPlaceholder("Nom du foyer").fill("Foyer correction");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);

  await page.goto("/app/my-tasks?tab=wizard");
  await expect(page.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Passer l'aspirateur");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("20");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Nettoyage");
  await page.getByPlaceholder("Ex: Cuisine").fill("Salon");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("textbox", { name: "Première date" }).fill(today);
  await page.getByRole("button", { name: "Tous les jours" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Créer la tâche" }).click();

  await page.goto("/app/my-tasks?tab=daily");
  await quickSkipOccurrence(page, "Passer l'aspirateur");
  await expect(page.getByText("Sautée").first()).toBeVisible();

  await completeOccurrenceWithDetails(page, "Passer l'aspirateur", {
    actualMinutes: "27",
    notes: "Finalement faite en fin de journée",
  });
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Terminée").first()).toBeVisible();
  await expect(page.getByText("Réel 27 min").first()).toBeVisible();
});

// ── Multi-member ─────────────────────────────────────────────────────────────

test("adding a member can rebalance future strict alternation tasks", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("rebalance-member", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Rebalance User", email });
  await page.getByPlaceholder("Nom du foyer").fill("Foyer rebalance");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);

  await openSettingsPanel(page, "team");
  await page.getByPlaceholder("Nom affiché").fill("Sam");
  await page.locator('input[name="color"]').fill("#1F6E8C");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await expect(page.getByText("Sam").first()).toBeVisible();

  await page.goto("/app/my-tasks?tab=wizard");
  await expect(page.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Rotation quotidienne");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("15");
  await page.getByPlaceholder("Ex: Nettoyage").fill("Routine");
  await page.getByPlaceholder("Ex: Cuisine").fill("Cuisine");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("textbox", { name: "Première date" }).fill(today);
  await page.getByRole("button", { name: "Tous les jours" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Créer la tâche" }).click();
  await page.waitForLoadState("networkidle");

  await openSettingsPanel(page, "team");
  await page.getByPlaceholder("Nom affiché").fill("Lea");
  await page.locator('input[name="color"]').fill("#2E8B57");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Rotation quotidienne · Lea/i }).first()).toBeVisible();
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
  await page.waitForURL(/household=/);

  await openSettingsPanel(page, "access");
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  const inviteLinkCopyButton = page.getByRole("button", { name: "Copier le lien" }).first();
  const inviteCodeCopyButton = page.getByRole("button", { name: "Copier le code" }).first();
  await expectCopyButtonToReact(inviteLinkCopyButton);
  await expectCopyButtonToReact(inviteCodeCopyButton);
  const inviteLink = await page
    .getByRole("link", { name: "Ouvrir le lien d'invitation" })
    .first()
    .getAttribute("href");
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

  await openSettingsPanel(guestPage, "households");
  await expect(guestPage.getByText("Foyer partagé")).toBeVisible();
  await guestPage.getByPlaceholder("Nom du nouveau foyer").fill("Deuxième foyer");
  await guestPage.locator('form[action="/api/households"] input[name="timezone"]').fill("Europe/Paris");
  await guestPage.getByRole("button", { name: "Créer un autre foyer" }).click();
  await guestPage.waitForLoadState("networkidle");
  await openSettingsPanel(guestPage, "households");
  await expect(guestPage.getByText("Foyer partagé")).toBeVisible();
  await expect(guestPage.getByText("Deuxième foyer")).toBeVisible();

  await guestPage.getByRole("link", { name: "Ouvrir" }).first().click();
  await guestPage.waitForLoadState("networkidle");
  await openSettingsPanel(guestPage, "households");
  await guestPage.getByRole("button", { name: "Quitter ce foyer" }).click();
  await guestPage.waitForLoadState("networkidle");
  await openSettingsPanel(guestPage, "households");
  await expect(guestPage.getByText("Deuxième foyer")).toBeVisible();
  await expect(guestPage.getByText("Foyer partagé")).toHaveCount(0);

  await guestContext.close();
});

// ── Dashboard & history ──────────────────────────────────────────────────────

test("dashboard quick actions and history filters stay usable", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("dashboard-history", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Dashboard History User", email });
  await createHousehold(page, "Foyer Dashboard");

  await createTaskFromWizard(page, {
    title: "Surface cuisine",
    minutes: "18",
    category: "Nettoyage",
    room: "Cuisine",
    recurrenceLabel: "Tous les jours",
  });

  await page.goto("/app/my-tasks?tab=daily");
  await completeOccurrenceWithDetails(page, "Surface cuisine", {
    actualMinutes: "19",
    notes: "Nettoyée après le repas",
  });

  await page.goto("/app");
  if (testInfo.project.name.includes("mobile")) {
    await expect(page.getByRole("link", { name: /Voir toutes mes/i }).first()).toBeVisible();
  } else {
    await expect(page.getByText("Créer une tâche").first()).toBeVisible();
  }
  await expect(page.getByText("Cuisine").first()).toBeVisible();

  await page.goto("/app/settings/activity");
  await page.getByRole("link", { name: "Terminées" }).click();
  await expect(page).toHaveURL(/filter=completed/);
  await expect(page.getByText("À l'instant")).toBeVisible();
  await expect(page.getByText("Surface cuisine")).toBeVisible();
});

// ── Recent activity feed ──────────────────────────────────────────────────────

test("recent activity feed appears on dashboard after task completion", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("activity-feed", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Feed User", email });
  await createHousehold(page, "Foyer Feed");

  await createTaskFromWizard(page, {
    title: "Vaisselle activité",
    minutes: "10",
    recurrenceLabel: "Tous les jours",
  });

  await page.goto("/app/my-tasks?tab=daily");
  await completeOccurrenceWithDetails(page, "Vaisselle activité", { actualMinutes: "10" });

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Ce qui vient de bouger" })).toBeVisible();
  await expect(page.getByText("Vaisselle activité")).toBeVisible();

  // "Tout voir" link leads to settings/activity
  await page.getByRole("link", { name: /Tout voir/i }).click();
  await expect(page).toHaveURL(/\/app\/settings\/activity/);
});

test("/app/history redirects to /app/settings/activity", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("history-redirect", testInfo.project.name);
  await registerAndLogin(page, { displayName: "Redirect User", email });
  await createHousehold(page, "Foyer Redirect");
  await page.goto("/app/history");
  await expect(page).toHaveURL(/\/app\/settings\/activity/);
});

// ── Reopen / undo completed task ──────────────────────────────────────────────

test("completed task can be reopened from settings/activity", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("reopen-activity", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Reopen User", email });
  await createHousehold(page, "Foyer Reopen");

  await createTaskFromWizard(page, {
    title: "Tâche à annuler",
    minutes: "5",
    recurrenceLabel: "Tous les jours",
  });

  await page.goto("/app/my-tasks?tab=daily");
  await completeOccurrenceWithDetails(page, "Tâche à annuler", { actualMinutes: "5" });

  // Go to activity page and find the reopen button on the completed entry
  await page.goto("/app/settings/activity");
  await expect(page.getByText("Tâche à annuler").first()).toBeVisible();

  // The "Correction d'erreur" section shows past occurrences with reopen buttons
  const reopenButtons = page.getByRole("button", { name: /Ré-ouvrir/i });
  await expect(reopenButtons.first()).toBeVisible();
  await reopenButtons.first().click();

  // After reopen, the occurrence should no longer appear as completed
  await expect(page.getByText("Tâche remise à faire")).toBeVisible();
});

test("stats drawer shows streak and member load", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("stats-drawer", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Stats User", email });
  await createHousehold(page, "Foyer Stats");

  await createTaskFromWizard(page, {
    title: "Tâche stats",
    minutes: "10",
    recurrenceLabel: "Tous les jours",
  });

  await page.goto("/app/my-tasks?tab=daily");
  await completeOccurrenceWithDetails(page, "Tâche stats", { actualMinutes: "10" });

  await page.goto("/app");
  const statsButton = page.getByRole("button", { name: /Stats|Voir les statistiques/i }).first();
  await expect(statsButton).toBeVisible();
  await statsButton.click();

  await expect(page.getByText("Statistiques du foyer")).toBeVisible();
  // Rolling metrics should be present
  await expect(page.getByText(/7 derniers jours/i)).toBeVisible();
});

// ── Comments ─────────────────────────────────────────────────────────────────

test("can post and view comments on an occurrence", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("comments", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Comment User", email });
  await createHousehold(page, "Foyer Comments");

  await page.goto("/app/my-tasks?tab=wizard");
  await expect(page.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill("Tâche avec note");
  await page.locator('input[name="estimatedMinutesVisible"]').fill("10");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("textbox", { name: "Première date" }).fill(today);
  await page.getByRole("button", { name: "Tous les jours" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Créer la tâche" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Tâche avec note" }).first()).toBeVisible();

  // Open action sheet → Commentaires
  await openOccurrenceActionSheet(page, "Tâche avec note");
  await page.getByRole("button", { name: "Commentaires" }).click();
  await expect(page.getByRole("heading", { name: "Commentaires" })).toBeVisible();
  await expect(page.getByText(/Aucun commentaire/i)).toBeVisible();

  // Post a comment
  const commentInput = page.getByRole("textbox", { name: "Nouveau commentaire" });
  await commentInput.fill("Première note de test");
  const commentResponse = page.waitForResponse(
    (r) => r.url().includes("/comments") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Envoyer le commentaire" }).click();
  await commentResponse;

  await expect(page.getByText("Première note de test")).toBeVisible();
});

// ── Notifications & appearance ────────────────────────────────────────────────

test("notifications settings page shows theme toggle and push notification toggle", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("notifications", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Notif User", email });
  await createHousehold(page, "Foyer Notifs");

  await openSettingsPanel(page, "notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

  // Theme toggle should offer 3 options
  await expect(page.getByRole("button", { name: /Clair|Light/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Sombre|Dark/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Système|System/i }).first()).toBeVisible();

  // Push toggle section present
  await expect(page.getByText(/Notifications push|Push/i).first()).toBeVisible();
});

test("dark mode toggle applies data-theme attribute immediately", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("dark-mode", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Dark Mode User", email });
  await createHousehold(page, "Foyer Dark");

  await openSettingsPanel(page, "notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

  // Default: no dark theme
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

  // Switch to dark
  await page.getByRole("button", { name: /Sombre|Dark/i }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Switch back to light
  await page.getByRole("button", { name: /Clair|Light/i }).first().click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

// ── Onboarding wizard ─────────────────────────────────────────────────────────

test("onboarding wizard lets user select and import suggested tasks", async ({
  page,
}, testInfo) => {
  const email = buildUniqueEmail("onboarding", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Onboarding User", email });

  // Create household but do NOT skip onboarding
  await page.getByPlaceholder("Nom du foyer").fill("Foyer Onboarding");
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);

  // Welcome step
  await expect(page.getByRole("heading", { name: /Bienvenue dans/i })).toBeVisible();
  await page.getByRole("button", { name: "C'est parti" }).click();

  // Tasks step – default selection has tasks checked
  await expect(page.getByRole("heading", { name: "Choisissez vos tâches" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aspirateur salon" })).toBeVisible();

  // Import the selected tasks
  await page.getByRole("button", { name: /Ajouter \d+ tâche/i }).click();

  // Should advance to invite step after successful creation
  await expect(page.getByRole("heading", { name: "Invitez votre équipe" })).toBeVisible();

  // Skip invite step → done
  await page.getByRole("button", { name: /Je ferai ça plus tard/i }).click();
  await expect(page.getByRole("heading", { name: "Tout est prêt !" })).toBeVisible();

  // CTA navigates to daily tasks
  await page.getByRole("link", { name: "Voir mes tâches" }).click();
  await expect(page).toHaveURL(/tab=daily/);
  await expect(page.getByRole("heading", { name: "Aspirateur salon" }).first()).toBeVisible();
});

// ── Desktop-only full scenario ────────────────────────────────────────────────

test("desktop: multi-member task management, repartition, and manual override preservation", async ({
  browser,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Ce scénario complet cible Chromium desktop.");

  const ownerEmail = buildUniqueEmail("owner-matrix", testInfo.project.name);
  const guestEmail = buildUniqueEmail("guest-matrix", testInfo.project.name);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  await registerAndLogin(page, { displayName: "Owner", email: ownerEmail });
  await createHousehold(page, "Foyer orchestration");

  await openSettingsPanel(page, "access");
  await page.locator('form[action*="/invites"] select[name="role"]').selectOption("admin");
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  const inviteLink = await page
    .getByRole("link", { name: "Ouvrir le lien d'invitation" })
    .first()
    .getAttribute("href");
  expect(inviteLink).toContain("/join/");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  await guestPage.goto(inviteLink!);
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

  await openSettingsPanel(page, "team");
  await page.getByPlaceholder("Nom affiché").fill("Lea");
  await page.locator('input[name="color"]').fill("#2E8B57");
  await page.getByRole("button", { name: "Ajouter le membre" }).click();
  await page.waitForLoadState("networkidle");

  await createTaskFromWizard(page, {
    title: "Rotation cuisine",
    minutes: "12",
    category: "Routine",
    room: "Cuisine",
    recurrenceLabel: "Tous les jours",
    assignmentLabel: "Alternance",
  });

  await guestPage.goto("/app/my-tasks?tab=wizard");
  await expect(guestPage.getByRole("heading", { name: "Créer une nouvelle tâche" })).toBeVisible();
  await guestPage.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await guestPage.getByPlaceholder("Ex: Sortir les poubelles").fill("Salle de bain");
  await guestPage.locator('input[name="estimatedMinutesVisible"]').fill("18");
  await guestPage.getByPlaceholder("Ex: Nettoyage").fill("Nettoyage");
  await guestPage.getByPlaceholder("Ex: Cuisine").fill("Salle de bain");
  await guestPage.getByRole("button", { name: "Continuer" }).click();
  await guestPage.getByRole("textbox", { name: "Première date" }).fill(today);
  await guestPage.getByRole("button", { name: "Chaque semaine" }).click();
  await guestPage.getByRole("button", { name: "Continuer" }).click();
  await guestPage.getByRole("button", { name: "Owner" }).click();
  await guestPage.getByRole("button", { name: "Lea" }).click();
  await guestPage.getByRole("button", { name: /^Fixe/i }).click();
  await guestPage.getByRole("button", { name: "Créer la tâche" }).click();
  await guestPage.waitForLoadState("networkidle");

  await page.goto("/app/calendar");
  await expect(page.getByRole("group", { name: /Rotation cuisine · Owner/i }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: /Rotation cuisine · Guest/i }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: /Rotation cuisine · Lea/i }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: /Salle de bain · Guest/i }).first()).toBeVisible();

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Rotation cuisine" }).first()).toBeVisible();
  await rescheduleOccurrence(page, "Rotation cuisine", tomorrow);
  await expect(page.getByText("Reportée").first()).toBeVisible();

  await openTaskAdministration(page);
  await page
    .locator("article.soft-panel", { hasText: "Rotation cuisine" })
    .getByRole("button", { name: "Modifier" })
    .click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator('input[name="title"]').fill("Rotation cuisine foyer");
  await editDialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Rotation cuisine foyer" }).first()).toBeVisible();
  await expect(page.getByText("Reportée").first()).toBeVisible();

  await openTaskAdministration(page);
  const managedTask = getManagedTaskCard(page, "Rotation cuisine foyer");
  await expect(managedTask).toContainText(/occurrence future modifiée/i);
  await managedTask.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/Souhaitez-vous également les supprimer/i)).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await page.waitForLoadState("networkidle");
  await expect(getManagedTaskCard(page, "Rotation cuisine foyer")).toHaveCount(0);

  // Rescheduled occurrence still appears (manual override preserved, not deleted)
  await page.goto("/app/my-tasks?tab=daily");
  await expect(page.getByRole("heading", { name: "Rotation cuisine foyer" }).first()).toBeVisible();
  await expect(page.getByText("Reportée").first()).toBeVisible();

  await page.goto("/app/settings/tasks");
  await expect(
    page.getByRole("heading", { name: /Catalogue du foyer|Gérer la bibliothèque/i }),
  ).toBeVisible();

  await guestContext.close();
});

// ── V3: Quick-add and unified task edit ─────────────────────────────────────

test("quick-add bar creates a task for today from home", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("quickadd", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Quick Add User", email });
  await createHousehold(page, "Foyer Rapide");

  await page.goto("/app");
  const input = page.getByRole("textbox", { name: "Nouvelle tâche" });
  await expect(input).toBeVisible();
  await input.fill("Vider le lave-vaisselle");

  const createResponse = page.waitForResponse(
    (r) => r.url().includes("/api/tasks") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ajouter la tâche" }).click();
  await createResponse;

  await expect(page.getByRole("heading", { name: "Vider le lave-vaisselle" }).first()).toBeVisible();
});

test("occurrence card opens inline template edit sheet without navigating away", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("edit-template", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Edit Template User", email });
  await createHousehold(page, "Foyer Modifier");

  await createTaskFromWizard(page, {
    title: "Sortir les poubelles",
    minutes: "5",
    recurrenceLabel: "Chaque semaine",
  });

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Sortir les poubelles" }).first()).toBeVisible();

  // Open the details sheet by tapping the card, then choose "Modifier le modèle"
  const card = getOccurrenceCard(page, "Sortir les poubelles");
  await card.getByRole("button", { name: /Actions pour Sortir/i }).click();
  await page.getByRole("button", { name: /Modifier le modèle/i }).click();

  // The inline sheet loads the template form and edit happens on /app (no navigation)
  await expect(page).toHaveURL(/\/app(\?|$)/);
  const titleInput = page.locator('input[name="title"]').last();
  await expect(titleInput).toHaveValue("Sortir les poubelles");

  // Update title and save — should refresh the card in place
  await titleInput.fill("Sortir les poubelles (rapide)");
  await page.getByRole("button", { name: "Enregistrer" }).last().click();

  await expect(page.getByRole("heading", { name: "Sortir les poubelles (rapide)" }).first()).toBeVisible();
});

test("occurrence card shows task history from the details sheet", async ({ page }, testInfo) => {
  const email = buildUniqueEmail("task-history", testInfo.project.name);

  await registerAndLogin(page, { displayName: "Task History User", email });
  await createHousehold(page, "Foyer Historique");

  await createTaskFromWizard(page, {
    title: "Vaisselle",
    minutes: "10",
    recurrenceLabel: "Tous les jours",
  });

  await page.goto("/app");
  await completeOccurrenceWithDetails(page, "Vaisselle", {
    actualMinutes: "12",
    notes: "Vaisselle du soir",
  });

  // Open action sheet and go to Historique de la tâche
  const card = getOccurrenceCard(page, "Vaisselle").first();
  await card.getByRole("button", { name: /Actions pour Vaisselle/i }).click();
  await page.getByRole("button", { name: /Historique de la tâche/i }).click();

  await expect(page.getByRole("heading", { name: "Historique de la tâche" })).toBeVisible();
  await expect(page.getByText(/Validée/i).first()).toBeVisible();
  await expect(page.getByText(/Vaisselle du soir/)).toBeVisible();
});

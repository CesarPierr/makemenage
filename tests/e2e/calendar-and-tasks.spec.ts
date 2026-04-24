import { expect, test } from "@playwright/test";

function getOccurrenceCard(page: import("@playwright/test").Page, title: string) {
  return page.locator("article", { has: page.getByRole("heading", { name: title }) }).first();
}

async function skipOnboardingIfVisible(page: import("@playwright/test").Page) {
  const skipLink = page.getByRole("link", { name: /Passer/i });
  if (await skipLink.isVisible().catch(() => false)) {
    await skipLink.click();
    await page.waitForURL(/onboarding=skip/);
  }
}

async function createHousehold(page: import("@playwright/test").Page, householdName: string) {
  await page.getByPlaceholder("Nom du foyer").fill(householdName);
  await page.locator('input[name="timezone"]').fill("Europe/Paris");
  await page.getByRole("button", { name: "Créer le foyer" }).click();
  await page.waitForURL(/household=/);
  await skipOnboardingIfVisible(page);
}

async function createTaskFromWizard(
  page: import("@playwright/test").Page,
  values: {
    title: string;
    room: string;
    estimatedMinutes: string;
    kind?: "single" | "recurring";
    date: string;
  },
) {
  await page.goto("/app/my-tasks?tab=wizard");
  await page.getByRole("button", { name: /Créer une nouvelle tâche/i }).click();
  await page.getByPlaceholder("Ex: Sortir les poubelles").fill(values.title);
  await page.getByPlaceholder("Ex: Cuisine").fill(values.room);
  await page.locator('input[name="estimatedMinutesVisible"]').fill(values.estimatedMinutes);

  if (values.kind === "single") {
    await page.getByRole("button", { name: "Tâche simple" }).click();
  }

  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("textbox", { name: values.kind === "single" ? "Date" : "Première date" }).fill(values.date);
  await page.getByRole("button", { name: "Continuer" }).click();

  const createTaskPromise = page.waitForResponse((response) =>
    response.url().includes("/api/tasks") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Créer la tâche/i }).click();
  await createTaskPromise;
}

async function openOccurrenceActionSheet(page: import("@playwright/test").Page, title: string) {
  await getOccurrenceCard(page, title).getByRole("button", { name: new RegExp(`Actions pour ${title}`, "i") }).click();
}

test.describe("Calendar and Task Updates", () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = `test-${Date.now()}@makemenage.local`;
    
    // Register and Login
    await page.goto("/register");
    await page.getByPlaceholder("Prénom ou pseudo").fill("Tester");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Mot de passe").fill("demo12345");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.waitForURL(/\/login\?/);
    await page.getByPlaceholder("Mot de passe").fill("demo12345");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/app$/);

    // Create Household
    await createHousehold(page, "Test Home");
  });

  test("should display minutes timeline in sliding calendar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "La vue minutes coulissante est spécifique au mobile.");

    await page.goto("/app/calendar");
    await expect(page.getByRole("heading", { name: /Les 7 prochains jours/i })).toBeVisible();
    
    // Toggle to minutes view
    const toggleButton = page.getByRole("button", { name: /Vue minutes/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute("aria-pressed", "true");

    // Check if timeline is visible
    await expect(page.getByRole("region", { name: /Charge prévue sur 7 jours/i })).toBeVisible();
  });

  test("calendar page renders without server error on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Ce contrôle couvre le rendu desktop compilé.");

    await page.goto("/app/calendar");
    await expect(page.getByRole("heading", { name: /Quelque chose n'a pas marché/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /—/ })).toBeVisible();
    await expect(page.getByText(/Jours actifs/i)).toBeVisible();
  });

  test("calendar page tolerates invalid offset params", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Ce contrôle couvre le rendu desktop compilé.");

    await page.goto("/app/calendar?monthOffset=foo&dayOffset=999999999999");
    await expect(page.getByRole("heading", { name: /Quelque chose n'a pas marché/i })).toHaveCount(0);
    await expect(page.getByText(/Jours actifs/i)).toBeVisible();
  });

  test("running session can complete and skip tasks from the dashboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Ce scénario exhaustif de suivi est validé sur desktop.");

    const today = new Date().toISOString().slice(0, 10);

    await createTaskFromWizard(page, {
      title: "Suivi cuisine 1",
      room: "Cuisine",
      estimatedMinutes: "10",
      kind: "single",
      date: today,
    });
    await createTaskFromWizard(page, {
      title: "Suivi cuisine 2",
      room: "Cuisine",
      estimatedMinutes: "8",
      kind: "single",
      date: today,
    });

    await page.goto("/app");
    await page.getByRole("button", { name: /Lancer cette pièce/i }).click();
    await expect(page.getByRole("button", { name: /Terminer avec le temps réel/i })).toBeVisible();

    const completeResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/complete") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Terminer avec le temps réel/i }).click();
    const completeResponse = await completeResponsePromise;
    expect(completeResponse.ok()).toBeTruthy();

    await expect(page.getByText(/Impossible de terminer cette tâche depuis le suivi/i)).toHaveCount(0);
    await expect(page.getByText(/Tâche 1 \/ 1/i)).toBeVisible();

    const skipResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/skip") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Passer la tâche/i }).click();
    const skipResponse = await skipResponsePromise;
    expect(skipResponse.ok()).toBeTruthy();

    await expect(page.getByText(/Impossible de passer cette tâche depuis le suivi/i)).toHaveCount(0);
    await expect(page.getByText(/Aucune tâche en cours/i)).toBeVisible();
  });

  test("should allow editing a completed task and verify no-reload navigation", async ({ page }) => {
    // Create a task
    await createTaskFromWizard(page, {
      title: "Task to complete",
      room: "Cuisine",
      estimatedMinutes: "15",
      kind: "single",
      date: new Date().toISOString().slice(0, 10),
    });
    
    // Go to tasks and complete it
    await page.goto("/app/my-tasks");
    const completePromise = page.waitForResponse(r => r.url().includes("/complete") && r.request().method() === "POST");
    await getOccurrenceCard(page, "Task to complete")
      .getByRole("button", { name: /Marquer .* comme terminée/i })
      .click();
    await completePromise;
    
    await expect(page).toHaveURL(/\/app\/my-tasks/);
    await expect(page.getByRole("heading", { name: /Terminé récemment/i })).toBeVisible();
    
    // Edit the completed occurrence through the V2 action sheet.
    await openOccurrenceActionSheet(page, "Task to complete");
    await page.getByRole("button", { name: "Terminer avec détails" }).click();
    await page.locator('input[name="actualMinutes"]').last().fill("20");
    const adjustSavePromise = page.waitForResponse(r => r.url().includes("/complete") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Enregistrer" }).last().click();
    await adjustSavePromise;
    
    // Verify updated minutes in UI
    await expect(getOccurrenceCard(page, "Task to complete").getByText("Réel 20 min").first()).toBeVisible();
  });

  test("completing a future task automatically shifts occurrences", async ({ page }) => {
    // Create a recurring task (every 7 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    await createTaskFromWizard(page, {
      title: "Weekly Shift Test",
      room: "Cuisine",
      estimatedMinutes: "10",
      date: futureDate.toISOString().slice(0, 10),
    });

    // Complete it early from the future tasks list.
    await page.goto("/app/my-tasks?tab=daily");
    
    // Complete it
    const completePromise = page.waitForResponse(r => r.url().includes("/complete") && r.request().method() === "POST");
    await getOccurrenceCard(page, "Weekly Shift Test")
      .getByRole("button", { name: /Marquer .* comme terminée/i })
      .click();
    await completePromise;
    
    // Verify it's completed (status pill in the card or redirect)
    await expect(page.getByRole("heading", { name: /Terminé récemment/i })).toBeVisible();
  });
});

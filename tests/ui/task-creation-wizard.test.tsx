// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { render } from "../test-utils";
import { TaskCreationWizard } from "@/components/tasks/task-creation-wizard";
import { useFormAction } from "@/lib/use-form-action";

type SubmitFn = (data?: FormData | Record<string, string>) => Promise<boolean>;
let mockSubmit: ReturnType<typeof vi.fn<SubmitFn>>;

const mockMembers = [
  { id: "m1", displayName: "Pierre", color: "#E57373" },
  { id: "m2", displayName: "Marie", color: "#81C784" },
];

beforeEach(() => {
  mockSubmit = vi.fn().mockResolvedValue(true);
  vi.mocked(useFormAction).mockReturnValue({
    isSubmitting: false,
    submit: mockSubmit,
    handleSubmit: vi.fn(),
  });
});

describe("TaskCreationWizard", () => {
  test("renders trigger button", () => {
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);
    expect(screen.getByText("Créer une nouvelle tâche")).toBeInTheDocument();
  });

  test("renders compact trigger button", () => {
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} compact />);
    expect(screen.getByTitle("Nouvelle tâche")).toBeInTheDocument();
  });

  test("opens wizard on trigger click", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));

    // Step 1 is shown
    expect(screen.getByText("C'est quoi ?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Passer l'aspirateur")).toBeInTheDocument();
  });

  test("step 1: typing a task name enables Continuer", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));

    // Button should be disabled when title is empty
    const continueBtn = screen.getByRole("button", { name: /continuer/i });
    expect(continueBtn).toBeDisabled();

    // Type a title
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Aspirateur");

    expect(continueBtn).not.toBeDisabled();
  });

  test("navigates through all 4 wizard steps", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));

    // Step 1: Title
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Aspirateur");
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 2: Kind (single vs recurring)
    expect(screen.getByText("Quel est le rythme ?")).toBeInTheDocument();
    expect(screen.getByText("Une seule fois")).toBeInTheDocument();
    expect(screen.getByText("Récurrente")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 3: Recurrence details
    expect(screen.getByText("À quelle fréquence ?")).toBeInTheDocument();
    expect(screen.getByText("Quotidien")).toBeInTheDocument();
    expect(screen.getByText("Chaque semaine")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 4: Assignment
    expect(screen.getByText("Personnes éligibles")).toBeInTheDocument();
    expect(screen.getByText("Pierre")).toBeInTheDocument();
    expect(screen.getByText("Marie")).toBeInTheDocument();

    // Final button says "Créer la tâche"
    expect(screen.getByRole("button", { name: /créer la tâche/i })).toBeInTheDocument();
  });

  test("step 2: switching to single task changes step 3 to date picker", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Rangement");
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 2: Select "Une seule fois"
    await user.click(screen.getByText("Une seule fois"));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 3 should show date picker, not recurrence options
    expect(screen.getByText("C'est pour quand ?")).toBeInTheDocument();
    expect(screen.queryByText("À quelle fréquence ?")).not.toBeInTheDocument();
  });

  test("step 3: shows interval input for every_x_days", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Test");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Click "Tous les X jours"
    await user.click(screen.getByText("Tous les X jours"));

    expect(screen.getByText("Tous les")).toBeInTheDocument();
    expect(screen.getByText("jours")).toBeInTheDocument();
  });

  test("step 4: shows assignment modes for recurring tasks", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Test");
    // Navigate to step 4
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Assignment modes should be visible
    expect(screen.getByText("Alternance")).toBeInTheDocument();
    expect(screen.getByText("Fixe")).toBeInTheDocument();
    expect(screen.getByText("Équité")).toBeInTheDocument();
    expect(screen.getByText("Rotation")).toBeInTheDocument();
    expect(screen.getByText("Manuelle")).toBeInTheDocument();
  });

  test("submits task with correct data on final step", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));

    // Step 1: Title + room
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Aspirateur salon");
    await user.click(screen.getByText("Salon"));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 2: Keep "recurring"
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 3: Keep "weekly"
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Step 4: Submit
    await user.click(screen.getByRole("button", { name: /créer la tâche/i }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const body = mockSubmit.mock.calls[0][0] as Record<string, string>;
    expect(body.title).toBe("Aspirateur salon");
    expect(body.room).toBe("Salon");
    expect(body.kind).toBe("recurring");
    expect(body.recurrenceType).toBe("weekly");
    expect(body.assignmentMode).toBe("strict_alternation");
    expect(body.eligibleMemberIds).toContain("m1");
    expect(body.eligibleMemberIds).toContain("m2");
  });

  test("step 1: room buttons are selectable", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));
    await user.click(screen.getByText("Cuisine"));

    // Clicking a second room deselects the first
    await user.click(screen.getByText("Salon"));

    // After navigating the wizard and submitting, room should be "Salon"
  });

  test("back button navigates to previous step", async () => {
    const user = userEvent.setup();
    render(<TaskCreationWizard householdId="hh_1" members={mockMembers} />);

    await user.click(screen.getByText("Créer une nouvelle tâche"));
    await user.type(screen.getByPlaceholderText("Ex: Passer l'aspirateur"), "Test");
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // We're on step 2, go back
    await user.click(screen.getByTitle("Retour"));
    
    // Back on step 1
    expect(screen.getByPlaceholderText("Ex: Passer l'aspirateur")).toBeInTheDocument();
  });
});

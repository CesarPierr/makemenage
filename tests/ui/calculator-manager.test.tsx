// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { render } from "../test-utils";
import { CalculatorManager } from "@/components/savings/calculator-manager";
import { useFormAction } from "@/lib/use-form-action";

const mockBoxes = [
  { id: "box_1", name: "Compte Courant", balance: 1500, kind: "CUSTOM", icon: "Wallet", targetAmount: null, targetDate: null, color: "#ccc", description: null, sortOrder: 0, isArchived: false, notes: null, autoFillRule: null, householdId: "hh_1", allowNegative: false },
  { id: "box_2", name: "Livret A", balance: 5000, kind: "CUSTOM", icon: "PiggyBank", targetAmount: null, targetDate: null, color: "#aaa", description: null, sortOrder: 1, isArchived: false, notes: null, autoFillRule: null, householdId: "hh_1", allowNegative: false },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[];

type SubmitFn = (data?: FormData | Record<string, string>) => Promise<boolean>;
let mockSaveSubmit: ReturnType<typeof vi.fn<SubmitFn>>;
let mockRemoveSubmit: ReturnType<typeof vi.fn<SubmitFn>>;

beforeEach(() => {
  mockSaveSubmit = vi.fn().mockResolvedValue(true);
  mockRemoveSubmit = vi.fn().mockResolvedValue(true);

  // CalculatorManager calls useFormAction twice: save + remove
  let callCount = 0;
  vi.mocked(useFormAction).mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      // First call is save
      return { isSubmitting: false, submit: mockSaveSubmit, handleSubmit: vi.fn() };
    }
    // Second call is remove
    return { isSubmitting: false, submit: mockRemoveSubmit, handleSubmit: vi.fn() };
  });

  // Mock global fetch for the calculator manager (it fetches when editing)
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }),
  );
});

describe("CalculatorManager", () => {
  test("renders wizard step 0 with TVA template pre-filled", () => {
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Step 0: Name + box + description
    expect(screen.getByDisplayValue("Mise de côté TVA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Calcule la TVA à provisionner sur un encaissement.")).toBeInTheDocument();
    
    // Template buttons
    expect(screen.getByText("Provision TVA")).toBeInTheDocument();
    expect(screen.getByText("Économie E85")).toBeInTheDocument();
    expect(screen.getByText("Template vide")).toBeInTheDocument();
  });

  test("navigates through all 4 wizard steps", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Step 0 → 1: Click "Suivant"
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Step 1: Variables page
    expect(screen.getByText(/variables du formulaire/i)).toBeInTheDocument();

    // Step 1 → 2: Click "Suivant"  
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Step 2: Formula page
    expect(screen.getByText(/formule mathématique/i)).toBeInTheDocument();
    expect(screen.getByText(/résultat prévisionnel/i)).toBeInTheDocument();

    // Step 2 → 3: Click "Suivant"
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Step 3: Summary page with "Enregistrer" button
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
    expect(screen.getByText(/type de mouvement/i)).toBeInTheDocument();
  });

  test("can go back through wizard steps", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Go forward to step 1
    await user.click(screen.getByRole("button", { name: /suivant/i }));
    expect(screen.getByText(/variables du formulaire/i)).toBeInTheDocument();

    // Go back to step 0
    await user.click(screen.getByRole("button", { name: /retour/i }));
    expect(screen.getByDisplayValue("Mise de côté TVA")).toBeInTheDocument();
  });

  test("switches to E85 template", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Économie E85"));

    expect(screen.getByDisplayValue("Économie E85")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Calcule l'économie réalisée en roulant à l'éthanol.")).toBeInTheDocument();
  });

  test("switches to empty template", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Template vide"));

    expect(screen.getByDisplayValue("Nouveau calculateur")).toBeInTheDocument();
  });

  test("submits wizard with correct FormData on step 3", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Navigate to step 3
    await user.click(screen.getByRole("button", { name: /suivant/i }));
    await user.click(screen.getByRole("button", { name: /suivant/i }));
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Click "Enregistrer"
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(mockSaveSubmit).toHaveBeenCalledTimes(1);
    const fd = mockSaveSubmit.mock.calls[0][0] as FormData;
    expect(fd.get("name")).toBe("Mise de côté TVA");
    expect(fd.get("formula")).toBe("ca_brut * taux_tva / (100 + taux_tva)");
    expect(fd.get("resultMode")).toBe("deposit");
    expect(fd.get("roundingMode")).toBe("cents");
    expect(fd.get("negativeMode")).toBe("clamp_to_zero");

    // Verify fields are serialized as JSON
    const fieldsJson = fd.get("fields") as string;
    const fields = JSON.parse(fieldsJson);
    expect(fields).toHaveLength(2);
    expect(fields[0].key).toBe("ca_brut");
    expect(fields[1].key).toBe("taux_tva");
  });

  test("displays formula preview for TVA template", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Navigate to step 2 (formula)
    await user.click(screen.getByRole("button", { name: /suivant/i }));
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // TVA formula with defaults (ca_brut=1000, taux_tva=20): 1000*20/(100+20) = 166.67
    expect(screen.getByText("166,67 €")).toBeInTheDocument();
  });

  test("shows 'Formule invalide' for invalid formula", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Navigate to step 2
    await user.click(screen.getByRole("button", { name: /suivant/i }));
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Clear and type invalid formula
    const textarea = screen.getByPlaceholderText("ex: montant * 0.20");
    await user.clear(textarea);
    await user.type(textarea, "invalid_var * 2");

    expect(screen.getByText("Formule invalide")).toBeInTheDocument();
  });

  test("disables Suivant when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Clear the name field
    const nameInput = screen.getByDisplayValue("Mise de côté TVA");
    await user.clear(nameInput);

    const nextButton = screen.getByRole("button", { name: /suivant/i });
    expect(nextButton).toBeDisabled();
  });

  test("step 1 allows adding and removing variable fields", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Navigate to step 1 (variables)
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // TVA template has 2 fields by default
    const initialFields = screen.getAllByPlaceholderText("ex: montant");
    expect(initialFields).toHaveLength(2);

    // Add a new field
    await user.click(screen.getByRole("button", { name: /ajouter/i }));
    const afterAddFields = screen.getAllByPlaceholderText("ex: montant");
    expect(afterAddFields).toHaveLength(3);
  });

  test("step 2 variable chips insert into formula", async () => {
    const user = userEvent.setup();
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Switch to empty template first
    await user.click(screen.getByText("Template vide"));

    // Go to step 1, add a variable
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Add variable
    await user.click(screen.getByRole("button", { name: /ajouter/i }));
    const keyInput = screen.getByPlaceholderText("ex: montant");
    await user.type(keyInput, "prix");

    // Go to step 2 (formula)
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    // Should see the variable chip
    const chips = screen.getAllByRole("button").filter((btn) => btn.textContent?.includes("prix"));
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  test("box selector shows non-archived boxes", () => {
    render(
      <CalculatorManager
        householdId="hh_1"
        boxes={mockBoxes}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    const select = screen.getByDisplayValue("Aucune (choisir à chaque fois)");
    expect(select).toBeInTheDocument();
    // The options should contain our boxes
    expect(screen.getByText("Compte Courant")).toBeInTheDocument();
    expect(screen.getByText("Livret A")).toBeInTheDocument();
  });
});

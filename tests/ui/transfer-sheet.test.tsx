// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi, beforeEach } from "vitest";

import { render } from "../test-utils";
import { TransferSheet } from "@/components/savings/transfer-sheet";
import { useFormAction } from "@/lib/use-form-action";

const mockBoxes = [
  { id: "box_1", name: "Compte Courant", balance: 1500, type: "CHECKING", kind: "CUSTOM", icon: "Wallet", targetAmount: null, targetDate: null, color: "#ccc", description: null, orderIndex: 0, createdAt: new Date(), updatedAt: new Date(), householdId: "hh_1", isHidden: false, isJoint: false },
  { id: "box_2", name: "Livret A", balance: 5000, type: "SAVINGS", kind: "CUSTOM", icon: "PiggyBank", targetAmount: null, targetDate: null, color: "#aaa", description: null, orderIndex: 1, createdAt: new Date(), updatedAt: new Date(), householdId: "hh_1", isHidden: false, isJoint: false },
] as any[];

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders transfer sheet and handles submission correctly", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const mockSubmit = vi.fn().mockResolvedValue(true);
  
  // Override the global mock to capture the submit function
  vi.mocked(useFormAction).mockReturnValue({
    isSubmitting: false,
    submit: mockSubmit,
    handleSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Emulate the actual component logic that calls submit manually
      const fd = new FormData(e.target as HTMLFormElement);
      // Wait, TransferSheet builds its own FormData and calls submit(fd).
      // If we use the real handle submit, we must bypass the mock.
      // But TransferSheet uses its own onSubmit that calls submit(fd).
    },
  });

  render(
    <TransferSheet
      isOpen={true}
      onClose={onClose}
      householdId="hh_1"
      boxes={mockBoxes}
    />
  );

  // Check if form elements are present
  expect(screen.getByRole("heading", { name: "Transférer" })).toBeInTheDocument();
  
  // Select the "Vers" box
  const toSelect = screen.getAllByRole("combobox")[1];
  await user.selectOptions(toSelect, "box_2");

  // Type amount
  const amountInput = screen.getByPlaceholderText("0,00");
  await user.type(amountInput, "150.50");

  // Type reason
  const reasonInput = screen.getByLabelText(/Raison/i);
  await user.type(reasonInput, "Virement mensuel");

  // Click submit
  const submitButton = screen.getByRole("button", { name: "Transférer" });
  await user.click(submitButton);

  // TransferSheet uses custom onSubmit that calls submit() directly
  // Let's verify submit was called with a FormData
  expect(mockSubmit).toHaveBeenCalledTimes(1);
  
  const submittedData = mockSubmit.mock.calls[0][0] as FormData;
  expect(submittedData.get("fromBoxId")).toBe("box_1");
  expect(submittedData.get("toBoxId")).toBe("box_2");
  expect(submittedData.get("amount")).toBe("150.50");
  expect(submittedData.get("reason")).toBe("Virement mensuel");
});

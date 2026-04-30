// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { render } from "../test-utils";
import { EntryForm } from "@/components/savings/entry-form";
import { useFormAction } from "@/lib/use-form-action";

let mockSubmit: ReturnType<typeof vi.fn<(data?: FormData | Record<string, string>) => Promise<boolean>>>;

beforeEach(() => {
  mockSubmit = vi.fn().mockResolvedValue(true);
  vi.mocked(useFormAction).mockReturnValue({
    isSubmitting: false,
    submit: mockSubmit,
    handleSubmit: vi.fn(),
  });
});

describe("EntryForm", () => {
  test("renders deposit form by default", () => {
    render(<EntryForm householdId="hh_1" boxId="box_1" />);

    expect(screen.getByText("Déposer")).toBeInTheDocument();
    expect(screen.getByText("Retirer")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0,00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument();
  });

  test("submits a deposit with correct FormData", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<EntryForm householdId="hh_1" boxId="box_1" onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText("0,00"), "250");
    await user.type(screen.getByPlaceholderText("Ex : courses, prime…"), "Prime trimestrielle");

    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const fd = mockSubmit.mock.calls[0][0] as FormData;
    expect(fd.get("type")).toBe("deposit");
    expect(fd.get("amount")).toBe("250");
    expect(fd.get("reason")).toBe("Prime trimestrielle");
    expect(fd.get("occurredOn")).toBeTruthy(); // today's date
  });

  test("switches to withdrawal mode and submits correctly", async () => {
    const user = userEvent.setup();

    render(<EntryForm householdId="hh_1" boxId="box_1" />);

    // Click the withdrawal button
    await user.click(screen.getByText("Retirer"));

    // Type amount
    await user.type(screen.getByPlaceholderText("0,00"), "75.50");

    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const fd = mockSubmit.mock.calls[0][0] as FormData;
    expect(fd.get("type")).toBe("withdrawal");
    expect(fd.get("amount")).toBe("75.50");
  });

  test("submit button is disabled when amount is empty", () => {
    render(<EntryForm householdId="hh_1" boxId="box_1" />);

    const button = screen.getByRole("button", { name: "Confirmer" });
    expect(button).toBeDisabled();
  });

  test("does not submit when amount is only whitespace", async () => {
    const user = userEvent.setup();
    render(<EntryForm householdId="hh_1" boxId="box_1" />);

    await user.type(screen.getByPlaceholderText("0,00"), "   ");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test("hides type selector when hideTypeSelector is true", () => {
    render(<EntryForm householdId="hh_1" boxId="box_1" hideTypeSelector defaultType="withdrawal" />);

    expect(screen.queryByText("Déposer")).not.toBeInTheDocument();
    expect(screen.queryByText("Retirer")).not.toBeInTheDocument();
  });

  test("constructs correct API action URL", () => {
    render(<EntryForm householdId="my-house" boxId="savings-box-99" />);

    expect(useFormAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "/api/households/my-house/savings/boxes/savings-box-99/entries",
      }),
    );
  });

  test("does not include reason in FormData when reason is empty", async () => {
    const user = userEvent.setup();
    render(<EntryForm householdId="hh_1" boxId="box_1" />);

    await user.type(screen.getByPlaceholderText("0,00"), "100");
    // Don't type a reason
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    const fd = mockSubmit.mock.calls[0][0] as FormData;
    expect(fd.get("reason")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  absenceSchema,
  savingsCalculatorSchema,
  savingsTransferSchema,
  savingsBoxCreateSchema,
} from "@/lib/validation";

describe("validation", () => {
  describe("absenceSchema", () => {
    it("validates valid dates", () => {
      const data = {
        memberId: "clh1234560000000000000000",
        startDate: "2024-01-01",
        endDate: "2024-01-05",
      };
      const result = absenceSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails if endDate is before startDate", () => {
      const data = {
        memberId: "clh1234560000000000000000",
        startDate: "2024-01-05",
        endDate: "2024-01-01",
      };
      const result = absenceSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("endDate must be on or after startDate");
      }
    });
  });

  describe("savingsTransferSchema", () => {
    it("fails if fromBoxId and toBoxId are the same", () => {
      const data = {
        fromBoxId: "clh1234560000000000000000",
        toBoxId: "clh1234560000000000000000",
        amount: "50",
        occurredOn: "2024-01-01",
      };
      const result = savingsTransferSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Source et destination doivent être différentes");
      }
    });
  });

  describe("savingsCalculatorSchema", () => {
    it("fails if field keys are not unique", () => {
      const data = {
        name: "Test Calc",
        formula: "a + b",
        fields: [
          { key: "a", label: "A" },
          { key: "a", label: "B" },
        ],
      };
      const result = savingsCalculatorSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Les clés de variables doivent être uniques.");
      }
    });
  });

  describe("amountString and positiveAmount transforms", () => {
    it("parses valid french amounts correctly", () => {
      const result = savingsBoxCreateSchema.safeParse({
        name: "Test Box",
        color: "#123456",
        initialBalance: "1 234,56",
        targetAmount: " 1000.5 ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initialBalance).toBe(1234.56);
        expect(result.data.targetAmount).toBe(1000.5);
      }
    });

    it("rejects negative target amount (positiveAmount)", () => {
      const result = savingsBoxCreateSchema.safeParse({
        name: "Test Box",
        color: "#123456",
        targetAmount: "-50",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Le montant doit être positif ou nul");
      }
    });
  });
});

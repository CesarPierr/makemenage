import { describe, expect, it } from "vitest";

import { evaluateFormula, FormulaError, interpolateReasonTemplate } from "@/lib/savings/formula";

describe("savings formula evaluator", () => {
  it("evaluates the E85 savings example", () => {
    const result = evaluateFormula(
      "(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))",
      {
        litres: 40,
        prix_sp95: 1.85,
        prix_e85: 0.85,
        surconsommation: 20,
      },
    );

    expect(Math.round(result * 100) / 100).toBe(33.2);
  });

  it("supports safe helper functions", () => {
    expect(evaluateFormula("max(0, round(prime * taux / 100))", { prime: 1234, taux: 15 })).toBe(185);
    expect(evaluateFormula("ceil(abs(delta))", { delta: -12.2 })).toBe(13);
  });

  it("rejects unknown variables and division by zero", () => {
    expect(() => evaluateFormula("unknown + 1", {})).toThrow(FormulaError);
    expect(() => evaluateFormula("10 / denom", { denom: 0 })).toThrow("Division par zéro");
  });

  it("interpolates reason templates", () => {
    expect(interpolateReasonTemplate("E85 — {litres} L à {prix_e85} €/L", {
      litres: 38,
      prix_e85: 0.899,
    })).toBe("E85 — 38 L à 0,90 €/L");
  });
});

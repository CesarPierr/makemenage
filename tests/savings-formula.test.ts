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
    expect(evaluateFormula("max(10, 20)", {})).toBe(20);
    expect(evaluateFormula("min(10, 20)", {})).toBe(10);
    expect(evaluateFormula("round(10.5)", {})).toBe(11);
    expect(evaluateFormula("ceil(10.1)", {})).toBe(11);
    expect(evaluateFormula("floor(10.9)", {})).toBe(10);
    expect(evaluateFormula("abs(-10)", {})).toBe(10);

    // Test unary minus
    expect(evaluateFormula("-10 + 5", {})).toBe(-5);
  });

  it("handles empty function calls correctly or throws", () => {
    expect(() => evaluateFormula("round()", {})).toThrow("La fonction round attend au moins un argument.");
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
    expect(interpolateReasonTemplate(null, {})).toBe(null);
    expect(interpolateReasonTemplate(undefined, {})).toBe(null);
    expect(interpolateReasonTemplate("  ", {})).toBe(null);
  });

  it("throws FormulaError for edge cases", () => {
    expect(() => evaluateFormula("", {})).toThrow("La formule est vide.");
    expect(() => evaluateFormula("a".repeat(501), {})).toThrow("La formule est trop longue.");
    expect(() => evaluateFormula("2 # 3", {})).toThrow("Caractère non autorisé : #");
    expect(() => evaluateFormula("2 + (3 * 4", {})).toThrow("Parenthèse fermante attendue.");
    expect(() => evaluateFormula("2 + 3 4", {})).toThrow("Expression inattendue en fin de formule.");
    expect(() => evaluateFormula("max(1 2)", {})).toThrow("Virgule ou parenthèse fermante attendue.");
    expect(() => evaluateFormula("* 3", {})).toThrow("Expression invalide.");
    
    expect(() => evaluateFormula("1.2.3", {})).toThrow("Nombre invalide : 1.2.3");
  });
});

import { describe, expect, it } from "vitest";
import { parseAmount, formatCurrency, formatSignedCurrency, toNumber, isValidAmount } from "@/lib/savings/currency";
import { Decimal } from "@prisma/client/runtime/library";

describe("currency", () => {
  describe("toNumber", () => {
    it("converts null and undefined to 0", () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
    });

    it("returns numbers as is", () => {
      expect(toNumber(123.45)).toBe(123.45);
      expect(toNumber(0)).toBe(0);
    });

    it("parses valid numeric strings", () => {
      expect(toNumber("123.45")).toBe(123.45);
      expect(toNumber("-50")).toBe(-50);
    });

    it("returns 0 for invalid string formats", () => {
      expect(toNumber("abc")).toBe(0);
    });

    it("converts Prisma Decimals correctly", () => {
      const dec = new Decimal("100.50");
      expect(toNumber(dec)).toBe(100.5);
    });
  });

  describe("formatCurrency", () => {
    it("formats numbers to fr-FR currency strings", () => {
      // Int.NumberFormat uses non-breaking spaces (ASCII 160) for grouping, and comma for decimal
      const formatted = formatCurrency(1234.56);
      expect(formatted).toMatch(/1\s?234,56\s?€/);
    });
  });

  describe("formatSignedCurrency", () => {
    it("adds an explicit + sign for positive values", () => {
      const formatted = formatSignedCurrency(1234.56);
      expect(formatted).toMatch(/\+1\s?234,56\s?€/);
    });

    it("handles negative values normally", () => {
      const formatted = formatSignedCurrency(-1234.56);
      expect(formatted).toMatch(/-1\s?234,56\s?€/);
    });

    it("does not add sign for zero", () => {
      const formatted = formatSignedCurrency(0);
      expect(formatted).not.toMatch(/\+0/);
    });
  });

  describe("parseAmount", () => {
    it("parses standard integer and decimal strings", () => {
      expect(parseAmount("1234.56")).toBe(1234.56);
      expect(parseAmount("1234,56")).toBe(1234.56);
      expect(parseAmount("-1234.56")).toBe(-1234.56);
      expect(parseAmount("12")).toBe(12);
    });

    it("handles spaces as thousand separators", () => {
      expect(parseAmount("1 234,56")).toBe(1234.56);
      expect(parseAmount("12 345")).toBe(12345);
    });

    it("returns null for non-string inputs", () => {
      // @ts-expect-error Testing invalid input at runtime
      expect(parseAmount(1234)).toBeNull();
      // @ts-expect-error Testing invalid input at runtime
      expect(parseAmount(null)).toBeNull();
    });

    it("returns null for strings with invalid characters", () => {
      expect(parseAmount("123a")).toBeNull();
      expect(parseAmount("12.34.56")).toBeNull();
    });

    it("limits parsing to 2 decimal places properly", () => {
      expect(parseAmount("1.234")).toBeNull();
    });
  });

  describe("isValidAmount", () => {
    it("checks if amount is finite and within Prisma Decimal limits", () => {
      expect(isValidAmount(1234.56)).toBe(true);
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(-100)).toBe(true);
      
      expect(isValidAmount(Number.NaN)).toBe(false);
      expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
      expect(isValidAmount(2_000_000_000_000)).toBe(false); // > 1e12
      expect(isValidAmount(-2_000_000_000_000)).toBe(false);
    });
  });
});

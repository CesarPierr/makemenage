import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { computeBalance } = await import("@/lib/savings/service");
import {
  formatCurrency,
  formatSignedCurrency,
  parseAmount,
  toNumber,
} from "@/lib/savings/currency";

describe("savings currency helpers", () => {
  it("parses fr-FR amounts with comma or dot", () => {
    expect(parseAmount("12,50")).toBe(12.5);
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount("1234")).toBe(1234);
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount(" -45,00 ")).toBe(-45);
  });

  it("rejects malformed amounts", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("12,345")).toBeNull(); // 3 decimals
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("12,3.4")).toBeNull();
  });

  it("rounds to 2 decimals to dodge float drift", () => {
    expect(parseAmount("0,1") ?? 0).toBe(0.1);
    // 0.1 + 0.2 in float drifts; parseAmount itself is fine but we test the round
    const v = (parseAmount("0,1") ?? 0) + (parseAmount("0,2") ?? 0);
    expect(Math.round(v * 100) / 100).toBe(0.3);
  });

  it("formats EUR with French conventions", () => {
    // Intl uses non-breaking spaces and unicode digits — match leniently
    const out = formatCurrency(1234.5);
    expect(out).toContain("1");
    expect(out).toContain("234");
    expect(out).toContain("50");
    expect(out).toContain("€");
  });

  it("formats signed currency with explicit + for deposits", () => {
    expect(formatSignedCurrency(45)).toMatch(/^\+/);
    expect(formatSignedCurrency(-45)).toMatch(/^-/);
  });

  it("converts decimals/strings/numbers to number", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("12.34")).toBe(12.34);
    expect(toNumber(42)).toBe(42);
  });
});

describe("savings balance computation", () => {
  it("sums signed amounts correctly", () => {
    const entries = [
      { type: "deposit" as const, amount: "100.00" },
      { type: "auto_fill" as const, amount: "50.00" },
      { type: "withdrawal" as const, amount: "20.00" },
      { type: "transfer_in" as const, amount: "30.00" },
      { type: "transfer_out" as const, amount: "10.00" },
    ];
    expect(computeBalance(entries)).toBe(150);
  });

  it("handles empty list as zero", () => {
    expect(computeBalance([])).toBe(0);
  });

  it("returns negative balance for debt-style boxes", () => {
    const entries = [
      { type: "deposit" as const, amount: "10" },
      { type: "withdrawal" as const, amount: "75" },
    ];
    expect(computeBalance(entries)).toBe(-65);
  });

  it("rounds to 2 decimals to avoid float drift", () => {
    const entries = [
      { type: "deposit" as const, amount: "0.1" },
      { type: "deposit" as const, amount: "0.2" },
    ];
    expect(computeBalance(entries)).toBe(0.3);
  });

  it("applies signed adjustment deltas directly", () => {
    const entries = [
      { type: "deposit" as const, amount: "100" },
      { type: "adjustment" as const, amount: "-25" },
      { type: "adjustment" as const, amount: "10" },
    ];
    expect(computeBalance(entries)).toBe(85);
  });
});

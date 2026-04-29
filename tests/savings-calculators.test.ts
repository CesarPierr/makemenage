import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/push", () => ({ sendPushToHousehold: vi.fn() }));

const { applyCalculatorRounding, resolveCalculatorEntry, resolveCalculatorTargetBoxId } = await import("@/lib/savings/calculators");

describe("savings calculator result handling", () => {
  it("rounds results according to calculator mode", () => {
    expect(applyCalculatorRounding(12.349, "cents")).toBe(12.35);
    expect(applyCalculatorRounding(12.9, "euro_floor")).toBe(12);
    expect(applyCalculatorRounding(12.1, "euro_ceil")).toBe(13);
    expect(applyCalculatorRounding(12.49, "euro_nearest")).toBe(12);
  });

  it("clamps negative results to zero by default", () => {
    expect(resolveCalculatorEntry({
      rawResult: -4.2,
      resultMode: "deposit",
      negativeMode: "clamp_to_zero",
      roundingMode: "cents",
    })).toEqual({ entryType: "deposit", amount: 0 });
  });

  it("can convert negative deposits to withdrawals", () => {
    expect(resolveCalculatorEntry({
      rawResult: -4.2,
      resultMode: "deposit",
      negativeMode: "convert_to_opposite",
      roundingMode: "cents",
    })).toEqual({ entryType: "withdrawal", amount: 4.2 });
  });

  it("uses the run target box before the calculator default box", () => {
    expect(resolveCalculatorTargetBoxId("default-box", "run-box")).toBe("run-box");
    expect(resolveCalculatorTargetBoxId("default-box", null)).toBe("default-box");
    expect(resolveCalculatorTargetBoxId(null, undefined)).toBeNull();
  });
});

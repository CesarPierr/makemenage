import { describe, expect, it } from "vitest";
import { clamp, cn, formatMinutes, percent } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges tailwind classes and handles conditional classes", () => {
      expect(cn("p-2", "text-red-500")).toBe("p-2 text-red-500");
      expect(cn("p-2", true && "text-red-500")).toBe("p-2 text-red-500");
      expect(cn("p-2", false && "text-red-500")).toBe("p-2");
      expect(cn("p-4 p-2")).toBe("p-2"); // twMerge handles overrides
    });
  });

  describe("formatMinutes", () => {
    it("formats minutes less than 60", () => {
      expect(formatMinutes(0)).toBe("0 min");
      expect(formatMinutes(45)).toBe("45 min");
      expect(formatMinutes(59)).toBe("59 min");
    });

    it("formats exact hours", () => {
      expect(formatMinutes(60)).toBe("1 h");
      expect(formatMinutes(120)).toBe("2 h");
    });

    it("formats hours and minutes", () => {
      expect(formatMinutes(65)).toBe("1 h 5");
      expect(formatMinutes(135)).toBe("2 h 15");
    });
  });

  describe("percent", () => {
    it("rounds and formats as percentage", () => {
      expect(percent(0)).toBe("0%");
      expect(percent(45.2)).toBe("45%");
      expect(percent(45.8)).toBe("46%");
      expect(percent(100)).toBe("100%");
    });
  });

  describe("clamp", () => {
    it("clamps values within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });
});

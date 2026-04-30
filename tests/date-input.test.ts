import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { parseDateInput, formatDateInput, todayDateInput } from "@/lib/date-input";

describe("date-input", () => {
  describe("parseDateInput", () => {
    it("returns Date object if passed a Date object", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(parseDateInput(date)).toBe(date);
    });

    it("returns Invalid Date if passed null, undefined, or empty string", () => {
      expect(parseDateInput(null).getTime()).toBeNaN();
      expect(parseDateInput(undefined).getTime()).toBeNaN();
      expect(parseDateInput("").getTime()).toBeNaN();
    });

    it("parses YYYY-MM-DD string to 12:00 local time of that day", () => {
      const parsed = parseDateInput("2024-02-15");
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(1); // 0-indexed, so 1 = Feb
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(12);
      expect(parsed.getMinutes()).toBe(0);
    });

    it("falls back to standard Date parsing for other formats", () => {
      const parsed = parseDateInput("2024-02-15T08:30:00Z");
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe("formatDateInput", () => {
    it("formats Date to YYYY-MM-DD string locally", () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(formatDateInput(date)).toBe("2024-01-05");

      const date2 = new Date(2023, 11, 25); // Dec 25, 2023
      expect(formatDateInput(date2)).toBe("2023-12-25");
    });
  });

  describe("todayDateInput", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns today's date formatted as YYYY-MM-DD", () => {
      vi.setSystemTime(new Date(2025, 4, 15, 10, 0, 0)); // May 15, 2025 local
      expect(todayDateInput()).toBe("2025-05-15");
    });
  });
});

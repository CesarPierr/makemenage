import { describe, expect, it } from "vitest";
import { format } from "date-fns";

import {
  buildGenerationKey,
  computeDueDate,
  computeNextAnchorAfter,
  describeRecurrence,
  generateRecurrenceDates,
} from "@/lib/scheduling/recurrence";

describe("recurrence engine", () => {
  it("generates biweekly dates deterministically", () => {
    const dates = generateRecurrenceDates(
      {
          type: "every_x_weeks",
          mode: "FIXED",
          interval: 2,
        anchorDate: new Date(2026, 0, 5),
      },
      new Date(2026, 0, 1),
      new Date(2026, 2, 31),
    );

    expect(dates.map((date) => format(date, "yyyy-MM-dd"))).toEqual([
      "2026-01-05",
      "2026-01-19",
      "2026-02-02",
      "2026-02-16",
      "2026-03-02",
      "2026-03-16",
      "2026-03-30",
    ]);
  });

  it("supports monthly simple rules", () => {
    const dates = generateRecurrenceDates(
      {
          type: "monthly_simple",
          mode: "FIXED",
          interval: 1,
        anchorDate: new Date(2026, 0, 10),
        dayOfMonth: 10,
      },
      new Date(2026, 0, 1),
      new Date(2026, 3, 30),
    );

    expect(dates.map((date) => format(date, "yyyy-MM-dd"))).toEqual([
      "2026-01-10",
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
    ]);
  });

  it("describes and keys rules in a stable way", () => {
    expect(
      describeRecurrence({
          type: "every_x_days",
          mode: "FIXED",
          interval: 14,
        anchorDate: new Date(2026, 0, 1),
      }),
    ).toContain("14");

    expect(buildGenerationKey("task_1", new Date(2026, 1, 3))).toBe("task_1:2026-02-03");
    expect(format(computeDueDate(new Date(2026, 1, 3), 2), "yyyy-MM-dd")).toBe("2026-02-05");
  });

  it("describes one-time tasks clearly", () => {
    expect(
      describeRecurrence({
          type: "daily",
          mode: "FIXED",
          interval: 1,
        anchorDate: new Date(2026, 0, 1),
        config: { singleRun: true },
      }),
    ).toBe("Une seule fois");
  });

  describe("computeNextAnchorAfter", () => {
    it("every_x_days: returns from + interval", () => {
      const next = computeNextAnchorAfter(
          { type: "every_x_days", mode: "FIXED", interval: 14, anchorDate: new Date(2026, 0, 1), dueOffsetDays: 0 },
        new Date(2026, 3, 25),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-05-09");
    });

    it("daily: returns next day", () => {
      const next = computeNextAnchorAfter(
          { type: "daily", mode: "FIXED", interval: 1, anchorDate: new Date(2026, 0, 1), dueOffsetDays: 0 },
        new Date(2026, 3, 25),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-04-26");
    });

    it("every_x_weeks: returns from + interval*7 days", () => {
      const next = computeNextAnchorAfter(
          { type: "every_x_weeks", mode: "FIXED", interval: 2, anchorDate: new Date(2026, 0, 1), dueOffsetDays: 0 },
        new Date(2026, 3, 25),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-05-09");
    });

    it("weekly: returns next matching weekday after fromDate", () => {
      // 2026-04-25 = Saturday (6). Weekdays = [1=Mon, 4=Thu] → next is Mon 2026-04-27
      const next = computeNextAnchorAfter(
          { type: "weekly", mode: "FIXED", interval: 1, weekdays: [1, 4], anchorDate: new Date(2026, 0, 1), dueOffsetDays: 0 },
        new Date(2026, 3, 25),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-04-27");
    });

    it("monthly_simple: jumps to next month when day-of-month already passed", () => {
      // April 25 with dayOfMonth=15 → next is May 15 (April 15 already passed)
      const next = computeNextAnchorAfter(
        {
            type: "monthly_simple",
            mode: "FIXED",
            interval: 1,
          dayOfMonth: 15,
          anchorDate: new Date(2026, 0, 1),
          dueOffsetDays: 0,
        },
        new Date(2026, 3, 25),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-05-15");
    });

    it("monthly_simple: stays in current month when day-of-month is still ahead", () => {
      // April 5 with dayOfMonth=15 → next is April 15 (still ahead)
      const next = computeNextAnchorAfter(
        {
            type: "monthly_simple",
            mode: "FIXED",
            interval: 1,
          dayOfMonth: 15,
          anchorDate: new Date(2026, 0, 1),
          dueOffsetDays: 0,
        },
        new Date(2026, 3, 5),
      );
      expect(format(next, "yyyy-MM-dd")).toBe("2026-04-15");
    });
  });
});

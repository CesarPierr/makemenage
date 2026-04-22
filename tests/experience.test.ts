import { describe, expect, it } from "vitest";

import { buildCalendarOverview, groupOccurrencesByRoom, sumOccurrenceMinutes } from "@/lib/experience";

describe("experience helpers", () => {
  it("groups occurrences by room and keeps the global room first", () => {
    const groups = groupOccurrencesByRoom([
      {
        scheduledDate: new Date("2026-04-22"),
        taskTemplate: { room: "Cuisine", estimatedMinutes: 12 },
      },
      {
        scheduledDate: new Date("2026-04-22"),
        taskTemplate: { room: null, estimatedMinutes: 8 },
      },
      {
        scheduledDate: new Date("2026-04-23"),
        taskTemplate: { room: "Cuisine", estimatedMinutes: 10 },
      },
    ]);

    expect(groups.map((group) => group.room)).toEqual(["Tout l'appartement", "Cuisine"]);
    expect(groups[1]?.occurrences).toHaveLength(2);
    expect(groups[1]?.totalMinutes).toBe(22);
  });

  it("sums occurrence minutes safely", () => {
    expect(
      sumOccurrenceMinutes([
        { scheduledDate: new Date("2026-04-22"), taskTemplate: { estimatedMinutes: 10 } },
        { scheduledDate: new Date("2026-04-23"), taskTemplate: { estimatedMinutes: 25 } },
      ]),
    ).toBe(35);
  });

  it("builds a calendar overview with distinct busy and absence days", () => {
    const overview = buildCalendarOverview(
      [
        { scheduledDate: new Date("2026-04-22") },
        { scheduledDate: new Date("2026-04-22") },
        { scheduledDate: new Date("2026-04-24") },
      ],
      [
        { startDate: new Date("2026-04-22"), endDate: new Date("2026-04-23") },
        { startDate: new Date("2026-04-25"), endDate: new Date("2026-04-25") },
      ],
    );

    expect(overview).toEqual({
      taskCount: 3,
      busyDays: 2,
      absenceCount: 2,
      absenceDays: 3,
    });
  });
});

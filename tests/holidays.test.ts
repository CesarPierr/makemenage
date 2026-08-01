import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dbMocks = vi.hoisted(() => ({
  holidayFindFirst: vi.fn(),
  holidayDeleteMany: vi.fn(),
  actionLogFindMany: vi.fn(),
  occurrenceUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    householdHoliday: { findFirst: dbMocks.holidayFindFirst, deleteMany: dbMocks.holidayDeleteMany },
    occurrenceActionLog: { findMany: dbMocks.actionLogFindMany },
    taskOccurrence: { update: dbMocks.occurrenceUpdate },
  },
}));

import { deleteHoliday } from "@/lib/holidays";

describe("deleteHoliday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("un-shifts the occurrences it moved and clears the manual override", async () => {
    // 12-day holiday (Jul 20–31 inclusive) → declareHoliday shifted things +12 days.
    dbMocks.holidayFindFirst.mockResolvedValue({
      id: "h1",
      householdId: "hh1",
      startDate: new Date("2026-07-20T00:00:00Z"),
      endDate: new Date("2026-07-31T00:00:00Z"),
    });
    dbMocks.actionLogFindMany.mockResolvedValue([
      {
        occurrenceId: "o1",
        occurrence: {
          id: "o1",
          scheduledDate: new Date("2026-08-04T00:00:00Z"),
          dueDate: new Date("2026-08-04T22:00:00Z"),
          status: "planned",
          isManuallyModified: true,
          rescheduleCount: 1,
        },
      },
    ]);
    dbMocks.occurrenceUpdate.mockResolvedValue({});

    await deleteHoliday({ holidayId: "h1", householdId: "hh1" });

    // Aug 4 shifted back by 12 days → Jul 23, and the manual flag is cleared.
    expect(dbMocks.occurrenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "o1" },
        data: expect.objectContaining({
          scheduledDate: new Date("2026-07-23T00:00:00Z"),
          isManuallyModified: false,
        }),
      }),
    );
    expect(dbMocks.holidayDeleteMany).toHaveBeenCalled();
  });

  it("no-ops when the holiday does not exist", async () => {
    dbMocks.holidayFindFirst.mockResolvedValue(null);
    await deleteHoliday({ holidayId: "nope", householdId: "hh1" });
    expect(dbMocks.occurrenceUpdate).not.toHaveBeenCalled();
    expect(dbMocks.holidayDeleteMany).not.toHaveBeenCalled();
  });
});
